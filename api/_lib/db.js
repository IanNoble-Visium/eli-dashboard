import { Pool } from 'pg'

// Create a global cached pool for serverless reuse
let pool

export function getPgPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL/POSTGRES_URL is not set')
    }
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  }
  return pool
}

export async function query(text, params = []) {
  const client = await getPgPool().connect()
  try {
    const res = await client.query(text, params)
    return res
  } finally {
    client.release()
  }
}

export function toMillisAgo(range) {
  const now = Date.now()
  switch (range) {
    case '30m': return now - 30 * 60 * 1000
    case '1h': return now - 60 * 60 * 1000
    case '4h': return now - 4 * 60 * 60 * 1000
    case '12h': return now - 12 * 60 * 60 * 1000
    case '24h': return now - 24 * 60 * 60 * 1000
    case '7d': return now - 7 * 24 * 60 * 60 * 1000
    case '30d': return now - 30 * 24 * 60 * 60 * 1000
    default: return now - 24 * 60 * 60 * 1000
  }
}

