import neo4j from 'neo4j-driver'

let driver

export function getNeo4jDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI
    const user = process.env.NEO4J_USERNAME
    const password = process.env.NEO4J_PASSWORD
    if (!uri || !user || !password) {
      throw new Error('NEO4J_URI/NEO4J_USERNAME/NEO4J_PASSWORD not set')
    }
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), { disableLosslessIntegers: true })
  }
  return driver
}

export async function runCypher(cypher, params = {}) {
  const session = getNeo4jDriver().session({ database: process.env.NEO4J_DATABASE || 'neo4j' })
  try {
    const result = await session.run(cypher, params)
    return result
  } finally {
    await session.close()
  }
}

