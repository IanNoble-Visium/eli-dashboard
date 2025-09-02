import { withCors } from '../_lib/cors.js'
import { query, toMillisAgo } from '../_lib/db.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const page = parseInt(req.query.page || '1', 10)
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500)
    const offset = (page - 1) * limit

    const search = (req.query.search || '').trim()
    const eventType = req.query.eventType
    const cameraId = req.query.cameraId
    const timeRange = req.query.timeRange || '7d'

    const startTs = Math.floor(toMillisAgo(timeRange))
    const where = ['start_time >= $1']
    const params = [startTs]

    if (search) {
      where.push('(id::text ILIKE $2 OR topic ILIKE $2 OR channel_name ILIKE $2)')
      params.push(`%${search}%`)
    }
    if (eventType) { where.push(`topic = $${params.length+1}`); params.push(eventType) }
    if (cameraId) { where.push(`channel_id = $${params.length+1}`); params.push(cameraId) }

    const countSql = `SELECT COUNT(*) as total FROM events WHERE ${where.join(' AND ')}`
    const countRes = await query(countSql, params)
    const total = Number(countRes.rows?.[0]?.total || 0)

    const evSql = `
      SELECT id, topic, module, level, start_time, latitude, longitude,
             channel_id, channel_name, channel_type, created_at,
             (SELECT COUNT(*) FROM snapshots WHERE event_id = events.id) as snapshot_count
      FROM events
      WHERE ${where.join(' AND ')}
      ORDER BY start_time DESC
      LIMIT $${params.length+1} OFFSET $${params.length+2}
    `
    const evParams = params.concat([limit, offset])
    const evRes = await query(evSql, evParams)

    res.json({
      events: evRes.rows || [],
      pagination: { page, limit, total, pages: Math.floor((total + limit - 1) / limit) },
      filters: { search, eventType, cameraId, timeRange },
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('events index error', e)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

