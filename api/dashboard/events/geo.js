const { withCors } = require('../../_lib/cors.js')
const { query } = require('../../_lib/db.js')

function toStartTs(range) {
  const now = Date.now()
  if (range === '24h') return now - 24*60*60*1000
  if (range === '7d') return now - 7*24*60*60*1000
  if (range === '30d') return now - 30*24*60*60*1000
  return now - 24*60*60*1000
}

module.exports = withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const timeRange = req.query.timeRange || '24h'
    const eventType = req.query.eventType
    const limit = Math.min(parseInt(req.query.limit||'100',10), 1000)
    const startTs = Math.floor(toStartTs(timeRange))

    const where = [
      'e.start_time >= $1',
      'e.latitude IS NOT NULL',
      'e.longitude IS NOT NULL'
    ]
    const params = [startTs]
    if (eventType) { where.push('e.topic = $2'); params.push(eventType) }

    const sql = `
      SELECT 
        e.id, e.topic, e.module, e.level, e.channel_id, e.channel_name,
        e.channel_type, e.start_time, e.latitude, e.longitude,
        COUNT(s.id) as snapshot_count
      FROM events e
      LEFT JOIN snapshots s ON e.id = s.event_id
      WHERE ${where.join(' AND ')}
      GROUP BY e.id, e.topic, e.module, e.level, e.channel_id, e.channel_name,
               e.channel_type, e.start_time, e.latitude, e.longitude
      ORDER BY e.start_time DESC
      LIMIT $${params.length + 1}
    `
    params.push(limit)

    const result = await query(sql, params)

    res.json({
      events: result.rows || [],
      timeRange,
      eventType,
      total: (result.rows||[]).length,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('geo error', e)
    res.status(500).json({ error: 'Failed to fetch geographic events' })
  }
})

