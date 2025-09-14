import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query, toMillisAgo } from '../_lib/db.js'
import { generateJson } from '../_lib/vertex.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '30m'
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))
    const endTs = useAbsolute ? endParam : Date.now()

    const topChannels = await query(
      `SELECT channel_id, channel_name, COUNT(*)::int AS events
       FROM events WHERE start_time BETWEEN $1 AND $2
       GROUP BY channel_id, channel_name
       ORDER BY events DESC LIMIT 10`,
      [startTs, endTs]
    )

    const recentAnoms = await query(
      `SELECT metric, entity_type, entity_id, value, score, threshold, ts
       FROM ai_anomalies WHERE ts BETWEEN $1 AND $2
       ORDER BY ts DESC LIMIT 20`,
      [startTs, endTs]
    )

    const context = {
      window: { startTs, endTs },
      topChannels: topChannels.rows,
      anomalies: recentAnoms.rows
    }

    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        recommendations: { type: 'array', items: { type: 'string' } }
      },
      required: ['summary']
    }

    const ai = await generateJson({
      systemInstruction: 'You are a security analytics assistant. Provide concise operational insights and actionable recommendations as JSON only.',
      schema,
      prompt: `Given the following telemetry context (JSON), produce a short summary (2-3 sentences) and up to 5 bullet recommendations.\n\nContext:\n${JSON.stringify(context).slice(0, 12000)}`
    })

    // Persist generated insight (optional; store when present)
    if (ai.output?.summary) {
      await query(
        `INSERT INTO ai_insights (scope, scope_id, summary, recommendations, context, ts)
         VALUES ('dashboard', NULL, $1, $2, $3, $4)`,
        [ai.output.summary, ai.output.recommendations || [], context, Date.now()]
      )
    }

    res.json({ status: 'ok', insights: ai.output || null, warning: ai.error || null, timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('[ai/insights] error', e)
    return res.status(500).json({ error: 'Insights generation failed' })
  }
}))

