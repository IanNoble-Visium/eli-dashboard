import { withCors } from '../_lib/cors'
import { query } from '../_lib/db'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  const { id } = req.query
  try {
    const eventSql = `SELECT * FROM events WHERE id = $1`
    const eventRes = await query(eventSql, [id])
    if (!eventRes.rows || eventRes.rows.length === 0) return res.status(404).json({ error: 'Event not found' })

    const snapsSql = `SELECT * FROM snapshots WHERE event_id = $1 ORDER BY created_at DESC`
    const snapsRes = await query(snapsSql, [id])

    res.json({ event: eventRes.rows[0], snapshots: snapsRes.rows || [], timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('event details error', e)
    res.status(500).json({ error: 'Failed to fetch event details' })
  }
})

