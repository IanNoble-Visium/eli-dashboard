import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query } from '../_lib/db.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const scope = (req.query.scope || 'channel').toString()
    const scopeId = req.query.scope_id ? req.query.scope_id.toString() : null
    const since = req.query.since ? Number(req.query.since) : (Date.now() - 24 * 60 * 60 * 1000)
    const limit = Math.min(Number(req.query.limit || 50), 200)

    let sql = `SELECT id, scope, scope_id, summary, recommendations, context, ts
               FROM ai_insights
               WHERE scope = $1 AND ts >= $2`
    const params = [scope, since]
    let next = 2
    if (scopeId) {
      next += 1
      sql += ` AND scope_id = $${next}`
      params.push(scopeId)
    }
    next += 1
    sql += ` ORDER BY ts DESC LIMIT $${next}`
    params.push(limit)

    const rows = await query(sql, params).then(r => r.rows)
    return res.json({ status: 'ok', count: rows.length, data: rows })
  } catch (e) {
    console.error('[api/ai/insights-feed] error', e)
    return res.status(500).json({ error: 'Failed to fetch insights' })
  }
}))

