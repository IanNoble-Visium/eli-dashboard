// Simple test API function for Vercel deployment verification
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'ELI Dashboard API is working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      hasDatabase: !!process.env.POSTGRES_URL,
      hasNeo4j: !!process.env.NEO4J_URI,
      hasAuth: !!process.env.APP_PASSWORD
    })
  }
  
  res.setHeader('Allow', ['GET', 'OPTIONS'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
