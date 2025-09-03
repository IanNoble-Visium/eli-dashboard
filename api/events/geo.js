import { withCors } from '../_lib/cors.js'
import { query, toMillisAgo } from '../_lib/db.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const limit = Math.min(parseInt(req.query.limit || '1000', 10), 2000)
    const eventType = req.query.eventType

    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '24h'

    const where = [
      'latitude IS NOT NULL',
      'longitude IS NOT NULL',
      'latitude BETWEEN -90 AND 90',
      'longitude BETWEEN -180 AND 180'
    ]
    const params = []

    if (startParam && endParam) {
      where.unshift('start_time >= $1 AND start_time <= $2')
      params.push(startParam, endParam)
    } else {
      const startTs = Math.floor(toMillisAgo(timeRange))
      where.unshift('start_time >= $1')
      params.push(startTs)
    }

    if (eventType) { where.push(`topic = $${params.length+1}`); params.push(eventType) }

    const sql = `
      SELECT id, topic, module, level, start_time, latitude, longitude,
             channel_id, channel_name, channel_type, created_at,
             (SELECT COUNT(*) FROM snapshots WHERE event_id = events.id) as snapshot_count
      FROM events
      WHERE ${where.join(' AND ')}
      ORDER BY start_time DESC
      LIMIT $${params.length+1}
    `
    params.push(limit)

    const result = await query(sql, params)

    res.json({
      events: result.rows || [],
      count: (result.rows || []).length,
      filters: { eventType, timeRange, limit },
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('geo events error', e)
    res.status(500).json({ error: 'Failed to fetch geographic events' })
  }
})

