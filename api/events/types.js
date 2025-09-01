import { withCors } from '../_lib/cors'
import { query } from '../_lib/db'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const sql = `
      SELECT topic, COUNT(*) as count
      FROM events
      WHERE topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
    `
    const result = await query(sql)
    res.json({ eventTypes: result.rows || [], timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('event types error', e)
    res.status(500).json({ error: 'Failed to fetch event types' })
  }
})

