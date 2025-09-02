const { withCors } = require('../_lib/cors.js')

module.exports = withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  res.json({ status: 'ok', service: 'ELI Dashboard API', timestamp: new Date().toISOString() })
})

