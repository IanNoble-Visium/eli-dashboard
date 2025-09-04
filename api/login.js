import { checkAuth, generateToken, setAuthCookie, verifyPassword, verifyToken } from './_lib/auth.js'
import { withCors } from './_lib/cors.js'
import { parse } from 'cookie'

export default withCors(async function handler(req, res) {
  if (req.method === 'POST') {
    const { password } = req.body
    console.log('Login attempt with password:', password)
    console.log('Expected password:', process.env.APP_PASSWORD)

    if (!password || !verifyPassword(password)) {
      console.log('Password verification failed')
      return res.status(401).json({ error: 'Invalid password' })
    }

    const token = generateToken()
    setAuthCookie(res, token)

    return res.status(200).json({ token })
  }

  if (req.method === 'GET') {
    // Check if authenticated - only check cookie for GET requests
    const cookies = parse(req.headers.cookie || '')
    const cookieToken = cookies.authToken

    if (cookieToken) {
      const decoded = verifyToken(cookieToken)
      if (decoded && decoded.authenticated) {
        return res.status(200).json({ authenticated: true })
      }
    }
    return res.status(401).json({ authenticated: false })
  }

  if (req.method === 'DELETE') {
    // Logout
    const { clearAuthCookie } = await import('./_lib/auth.js')
    clearAuthCookie(res)
    return res.status(200).json({ message: 'Logged out' })
  }

  res.setHeader('Allow', ['POST', 'GET', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
})