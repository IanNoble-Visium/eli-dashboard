import { withCors } from '../_lib/cors.js'
import { query } from '../_lib/db.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const sql = `
      SELECT channel_id, channel_name, channel_type, COUNT(*) as event_count
      FROM events
      WHERE channel_id IS NOT NULL
      GROUP BY channel_id, channel_name, channel_type
      ORDER BY event_count DESC
    `
    const result = await query(sql)
    res.json({ cameras: result.rows || [], timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('cameras error', e)
    res.status(500).json({ error: 'Failed to fetch cameras' })
  }
})

