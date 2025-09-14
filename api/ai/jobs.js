import { withCors } from '../_lib/cors.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  return res.status(410).json({ error: 'Jobs endpoint deprecated: processing moved to Pub/Sub worker (@ELI-DEMO)'} )
})

