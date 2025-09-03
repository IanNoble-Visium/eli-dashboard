import { withCors } from '../_lib/cors.js'
import { query, toMillisAgo } from '../_lib/db.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '24h'

    const useAbsolute = Boolean(startParam && endParam)
    const where = [useAbsolute ? 'channel_id IS NOT NULL AND start_time >= $1 AND start_time <= $2' : 'channel_id IS NOT NULL AND start_time >= $1']
    const params = useAbsolute ? [startParam, endParam] : [Math.floor(toMillisAgo(timeRange))]

    const sql = `
      SELECT channel_id, channel_name, channel_type, COUNT(*) as event_count
      FROM events
      WHERE ${where.join(' AND ')}
      GROUP BY channel_id, channel_name, channel_type
      ORDER BY event_count DESC
    `
    const result = await query(sql, params)
    res.json({ cameras: result.rows || [], timestamp: new Date().toISOString(), timeRange, start: startParam, end: endParam })
  } catch (e) {
    console.error('cameras error', e)
    res.status(500).json({ error: 'Failed to fetch cameras' })
  }
})

