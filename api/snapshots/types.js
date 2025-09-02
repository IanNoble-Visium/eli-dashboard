import { withCors } from '../_lib/cors.js'
import { query } from '../_lib/db.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const sql = `
      SELECT type, COUNT(*) as count
      FROM snapshots
      WHERE type IS NOT NULL
      GROUP BY type
      ORDER BY count DESC
    `
    const result = await query(sql)
    res.json({ snapshotTypes: result.rows || [], timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('snapshot types error', e)
    res.status(500).json({ error: 'Failed to fetch snapshot types' })
  }
})

