const { withCors } = require('../_lib/cors.js')
const { query } = require('../_lib/db.js')

module.exports = withCors(async function handler(req, res) {
  const { id } = req.query
  try {
    if (req.method === 'GET') {
      const r = await query('SELECT id, username, email FROM users WHERE id = $1', [id])
      if (!r.rows || r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
      return res.json(r.rows[0])
    }
    if (req.method === 'PUT') {
      const { username, email } = req.body || {}
      const r = await query('UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING id, username, email', [username, email, id])
      return res.json(r.rows?.[0])
    }
    if (req.method === 'DELETE') {
      await query('DELETE FROM users WHERE id = $1', [id])
      return res.status(204).end()
    }
    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (e) {
    console.error('users id error', e)
    res.status(500).json({ error: 'Users endpoint failed' })
  }
})

