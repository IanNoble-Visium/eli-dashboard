import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query, toMillisAgo } from '../_lib/db.js'
import { classifyPatterns } from '../_lib/vertex.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '30m'
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))
    const windowEnd = useAbsolute ? endParam : Date.now()

    // Build compact baseline features per channel/user from events
    const baselineSql = `
      SELECT channel_id, channel_name,
             COUNT(*)::int AS events,
             COUNT(DISTINCT topic)::int AS topics,
             MIN(start_time)::bigint AS first_ts,
             MAX(start_time)::bigint AS last_ts
      FROM events WHERE start_time >= $1 AND start_time <= $2
      GROUP BY channel_id, channel_name
      ORDER BY events DESC LIMIT 50`
    const base = await query(baselineSql, [startTs, windowEnd])

    const context = { window: { start: startTs, end: windowEnd }, channels: base.rows }

    const schema = {
      type: 'object',
      properties: {
        baselines: { type: 'array', items: { type: 'object', properties: {
          id: { type: 'string' }, label: { type: 'string' },
          ratePerMin: { type: 'number' }, topicDiversity: { type: 'number' },
          deviationHints: { type: 'array', items: { type: 'string' } },
        }, required: ['id','label'] } },
        notes: { type: 'array', items: { type: 'string' } }
      },
      required: ['baselines']
    }

    const result = await classifyPatterns({ context, schema })

    res.json({
      status: 'ok',
      window: { start: startTs, end: windowEnd },
      inputSample: base.rows?.slice(0, 5) || [],
      baselines: result.output?.baselines || [],
      notes: result.output?.notes || [],
      warning: result.error,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[ai/behavior] error', e)
    res.status(500).json({ error: 'Behavior analysis failed' })
  }
}))

