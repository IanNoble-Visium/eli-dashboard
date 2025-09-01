import { withCors } from '../_lib/cors'
import { query } from '../_lib/db'

export default withCors(async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await query('SELECT id, username, email FROM users')
      return res.json(result.rows || [])
    }
    if (req.method === 'POST') {
      const { username, email } = req.body || {}
      const insert = await query('INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email', [username, email])
      return res.status(201).json(insert.rows?.[0])
    }
    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (e) {
    console.error('users index error', e)
    res.status(500).json({ error: 'Users endpoint failed' })
  }
})

