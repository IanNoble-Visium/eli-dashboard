const { withCors } = require('../_lib/cors.js')
const { query, toMillisAgo } = require('../_lib/db.js')

module.exports = withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const limit = Math.min(parseInt(req.query.limit || '1000', 10), 2000)
    const timeRange = req.query.timeRange || '24h'
    const eventType = req.query.eventType

    const startTs = Math.floor(toMillisAgo(timeRange))
    const where = [
      'start_time >= $1',
      'latitude IS NOT NULL',
      'longitude IS NOT NULL',
      'latitude BETWEEN -90 AND 90',
      'longitude BETWEEN -180 AND 180'
    ]
    const params = [startTs]

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

