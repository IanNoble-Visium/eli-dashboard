import jwt from 'jsonwebtoken'
import { parse, serialize } from 'cookie'

console.log('Auth module loaded, checking environment variables:')
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'defined' : 'undefined')
console.log('APP_PASSWORD:', process.env.APP_PASSWORD ? 'defined' : 'undefined')

export function generateToken() {
  return jwt.sign({ authenticated: true }, process.env.JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return null
  }
}

export function checkAuth(req) {
  const cookies = parse(req.headers.cookie || '')
  const cookieToken = cookies.authToken
  const headerToken = req.headers.authorization?.replace('Bearer ', '')

  // Allow authentication with either cookie OR header token (not both required)
  const token = cookieToken || headerToken
  if (!token) return false

  const decoded = verifyToken(token)
  return decoded && decoded.authenticated
}

export function setAuthCookie(res, token) {
  const cookie = serialize('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/'
  })
  res.setHeader('Set-Cookie', cookie)
}

export function clearAuthCookie(res) {
  const cookie = serialize('authToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  })
  res.setHeader('Set-Cookie', cookie)
}

export function verifyPassword(password) {
  console.log('verifyPassword called with:', password, 'type:', typeof password)
  console.log('APP_PASSWORD:', process.env.APP_PASSWORD, 'type:', typeof process.env.APP_PASSWORD)
  const result = password === process.env.APP_PASSWORD
  console.log('Comparison result:', result)
  return result
}

export function withAuth(handler) {
  return async (req, res) => {
    // Skip auth check for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return handler(req, res)
    }

    if (!checkAuth(req)) {
      // Ensure CORS headers are set even for auth failures
      const originsEnv = process.env.CORS_ORIGINS || ''
      const allowed = originsEnv
        ? originsEnv.split(',')
        : ['http://localhost:5173', 'http://localhost:3000']

      const origin = req.headers.origin
      if (origin && (origin.includes('localhost') || allowed.includes(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Allow-Credentials', 'true')

      return res.status(401).json({ error: 'Unauthorized' })
    }
    return handler(req, res)
  }
}