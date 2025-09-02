import { withCors } from '../_lib/cors.js'
import { runCypher } from '../_lib/neo4j.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000)
    const cypher = `
      MATCH (c:Camera)-[g:GENERATED]->(e:Event)
      OPTIONAL MATCH (e)-[h:HAS_SNAPSHOT]->(i:Image)
      OPTIONAL MATCH (e)-[t:TAGGED]->(tag:Tag)
      RETURN c, e, i, tag, g, h, t
      LIMIT $limit
    `
    const result = await runCypher(cypher, { limit })
    res.json({ records: result.records || [], timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('graph error', e)
    res.status(500).json({ error: 'Failed to fetch graph data' })
  }
})

