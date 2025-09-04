export function withCors(handler) {
  return async (req, res) => {
    const originsEnv = process.env.CORS_ORIGINS || ''
    const allowed = originsEnv
      ? originsEnv.split(',')
      : ['http://localhost:5173', 'http://localhost:3000']

    const origin = req.headers.origin
    console.log('CORS check - Origin:', origin, 'Allowed:', allowed)

    // Allow localhost origins for development
    if (origin && (origin.includes('localhost') || allowed.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      console.log('CORS allowed for origin:', origin)
    } else {
      console.log('CORS denied for origin:', origin)
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS request')
      res.status(204).end()
      return
    }
    return handler(req, res)
  }
}
