import { withCors } from '../_lib/cors.js'
import { query } from '../_lib/db.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  const { id } = req.query
  try {
    const sql = `
      SELECT s.id, s.event_id, s.type, s.path, s.image_url, s.created_at,
             e.topic, e.module, e.level, e.channel_id, e.channel_name,
             e.channel_type, e.start_time, e.latitude, e.longitude
      FROM snapshots s
      JOIN events e ON s.event_id = e.id
      WHERE s.id = $1
    `
    const result = await query(sql, [id])
    if (!result.rows || result.rows.length === 0) return res.status(404).json({ error: 'Snapshot not found' })

    res.json({ snapshot: result.rows[0], timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('snapshot details error', e)
    res.status(500).json({ error: 'Failed to fetch snapshot details' })
  }
})

