import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query, toMillisAgo } from '../_lib/db.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const eventType = req.query.eventType
    const cameraId = req.query.cameraId

    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = (req.query.timeRange || '24h')

    const now = Date.now()
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))

    // Choose bucket count to keep histogram lightweight in the UI
    const desiredBuckets = 80
    const endTs = useAbsolute ? endParam : now
    const spanMs = Math.max(1, endTs - startTs)
    const bucketSeconds = Math.max(60, Math.floor(spanMs / (desiredBuckets * 1000)))

    let interval = '1 hour'
    if (!useAbsolute) {
      if (timeRange === '30m') interval = '5 minutes'
      else if (timeRange === '1h') interval = '10 minutes'
      else if (timeRange === '4h') interval = '30 minutes'
      else if (timeRange === '12h') interval = '1 hour'
      else if (timeRange === '7d') interval = '1 day'
      else if (timeRange === '30d') interval = '1 day'
    } else {
      // Heuristic intervals for absolute windows (approximate desiredBuckets)
      const mins = Math.max(1, Math.floor(bucketSeconds / 60))
      interval = `${mins} minutes`
    }

    const where = [useAbsolute ? 'start_time >= $1 AND start_time <= $2' : 'start_time >= $1']
    const params = useAbsolute ? [startTs, endParam] : [startTs]

    if (eventType) { where.push('topic = $' + (params.length + 1)); params.push(eventType) }
    if (cameraId) { where.push('channel_id = $' + (params.length + 1)); params.push(cameraId) }

    const bucketIdx = params.length + 1
    params.push(bucketSeconds)

    const sql = `
      SELECT
        TO_TIMESTAMP(FLOOR(start_time / 1000 / $${bucketIdx}) * $${bucketIdx}) as time_bucket,
        COUNT(*)::int as event_count
      FROM events
      WHERE ${where.join(' AND ')}
      GROUP BY 1
      ORDER BY 1
    `

    const result = await query(sql, params)

    res.json({
      timeRange,
      interval,
      data: result.rows || [],
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('timeline error', e)
    res.status(500).json({ error: 'Failed to fetch timeline data' })
  }
}))

