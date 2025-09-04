import { withCors } from '../_lib/cors.js'
import { runCypher } from '../_lib/neo4j.js'
import { toMillisAgo } from '../_lib/db.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '30m'
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))

    const facesLimit = Math.min(parseInt(req.query.facesLimit || '200', 10), 1000)
    const platesLimit = Math.min(parseInt(req.query.platesLimit || '200', 10), 1000)

    const whereParts = ['e.start_time >= $start']
    const params = { start: startTs }
    if (useAbsolute) { whereParts.push('e.start_time <= $end'); params.end = endParam }

    // Faces query
    const facesCypher = `
      MATCH (e:Event)
      WHERE ${whereParts.join(' AND ')}
      OPTIONAL MATCH (e)-[:MATCHED_FACE]->(fi:FaceIdentity)
      WITH fi, e
      WHERE fi IS NOT NULL
      OPTIONAL MATCH (fi)-[:IN_LIST]->(wl:Watchlist)
      WITH fi, collect(DISTINCT wl) AS wls, count(DISTINCT e) AS events
      RETURN fi AS node, wls AS lists, events AS events
      ORDER BY coalesce(fi.similarity, 0) DESC
      LIMIT toInteger($facesLimit)
    `

    const facesResult = await runCypher(facesCypher, { ...params, facesLimit })
    const faces = facesResult.records.map(r => {
      const node = r.get('node')
      const wls = r.get('lists') || []
      const events = r.get('events') || 0
      return {
        id: node?.properties?.id,
        similarity: node?.properties?.similarity ?? null,
        first_name: node?.properties?.first_name ?? null,
        last_name: node?.properties?.last_name ?? null,
        watchlists: wls.map(w => ({ id: w.properties?.id, name: w.properties?.name, level: w.properties?.level })),
        events: Number(events) || 0
      }
    })

    // Plates query
    const platesCypher = `
      MATCH (e:Event)
      WHERE ${whereParts.join(' AND ')}
      OPTIONAL MATCH (e)-[:MATCHED_PLATE]->(pi:PlateIdentity)
      WITH pi, e
      WHERE pi IS NOT NULL
      OPTIONAL MATCH (pi)-[:IN_LIST]->(wl:Watchlist)
      WITH pi, collect(DISTINCT wl) AS wls, count(DISTINCT e) AS events
      RETURN pi AS node, wls AS lists, events AS events
      ORDER BY coalesce(pi.number, '') ASC
      LIMIT toInteger($platesLimit)
    `

    const platesResult = await runCypher(platesCypher, { ...params, platesLimit })
    const plates = platesResult.records.map(r => {
      const node = r.get('node')
      const wls = r.get('lists') || []
      const events = r.get('events') || 0
      return {
        id: node?.properties?.id,
        number: node?.properties?.number ?? null,
        state: node?.properties?.state ?? null,
        owner_first_name: node?.properties?.owner_first_name ?? null,
        owner_last_name: node?.properties?.owner_last_name ?? null,
        watchlists: wls.map(w => ({ id: w.properties?.id, name: w.properties?.name, level: w.properties?.level })),
        events: Number(events) || 0
      }
    })

    res.json({
      timeRange,
      window: { start: startTs, end: useAbsolute ? endParam : Date.now() },
      faces,
      plates,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('identities error', e)
    res.status(500).json({ error: 'Failed to fetch identities' })
  }
})

