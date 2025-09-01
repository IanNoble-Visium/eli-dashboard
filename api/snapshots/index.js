import { withCors } from '../_lib/cors'
import { query, toMillisAgo } from '../_lib/db'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const page = parseInt(req.query.page || '1', 10)
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500)
    const offset = (page - 1) * limit

    const eventId = req.query.eventId
    const type = req.query.type
    const timeRange = req.query.timeRange || '7d'
    const startTs = Math.floor(toMillisAgo(timeRange))

    const where = ['s.created_at >= TO_TIMESTAMP($1 / 1000)']
    const params = [startTs]
    if (eventId) { where.push(`s.event_id = $${params.length+1}`); params.push(eventId) }
    if (type) { where.push(`s.type = $${params.length+1}`); params.push(type) }

    const countSql = `
      SELECT COUNT(*) as total
      FROM snapshots s
      JOIN events e ON s.event_id = e.id
      WHERE ${where.join(' AND ')}
    `
    const countRes = await query(countSql, params)
    const total = Number(countRes.rows?.[0]?.total || 0)

    const sql = `
      SELECT s.id, s.event_id, s.type, s.path, s.image_url, s.created_at,
             e.topic, e.channel_id, e.channel_name, e.start_time
      FROM snapshots s
      JOIN events e ON s.event_id = e.id
      WHERE ${where.join(' AND ')}
      ORDER BY s.created_at DESC
      LIMIT $${params.length+1} OFFSET $${params.length+2}
    `
    const result = await query(sql, params.concat([limit, offset]))

    res.json({
      snapshots: result.rows || [],
      pagination: { page, limit, total, pages: Math.floor((total + limit - 1) / limit) },
      filters: { eventId, type, timeRange },
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('snapshots error', e)
    res.status(500).json({ error: 'Failed to fetch snapshots' })
  }
})

