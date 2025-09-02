export function withCors(handler) {
  return async (req, res) => {
    const originsEnv = process.env.CORS_ORIGINS || ''
    const allowed = originsEnv
      ? originsEnv.split(',')
      : ['http://localhost:5173', 'http://localhost:3000']

    const origin = req.headers.origin
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    return handler(req, res)
  }
}
