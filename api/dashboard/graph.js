import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { runCypher } from '../_lib/neo4j.js'
import { toMillisAgo } from '../_lib/db.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })

  try {
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000)

    // Optional time filtering aligned with other dashboard endpoints
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '30m'
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))

    // Build WHERE clause dynamically
    const whereParts = [ 'e.start_time >= $start' ]
    const params = { limit, start: startTs }
    if (useAbsolute) {
      whereParts.push('e.start_time <= $end')
      params.end = endParam
    }

    // Updated Cypher to include FaceIdentity, PlateIdentity, and Watchlist relationships
    const cypher = `
      MATCH (c:Camera)-[g:GENERATED]->(e:Event)
      WHERE ${whereParts.join(' AND ')}
      OPTIONAL MATCH (e)-[h:HAS_SNAPSHOT]->(i:Image)
      OPTIONAL MATCH (e)-[t:TAGGED]->(tag:Tag)
      OPTIONAL MATCH (e)-[mf:MATCHED_FACE]->(fi:FaceIdentity)
      OPTIONAL MATCH (fi)-[fil:IN_LIST]->(fl:Watchlist)
      OPTIONAL MATCH (e)-[mp:MATCHED_PLATE]->(pi:PlateIdentity)
      OPTIONAL MATCH (pi)-[pil:IN_LIST]->(pl:Watchlist)
      OPTIONAL MATCH (e)-[el:IN_LIST]->(wl:Watchlist)
      RETURN c, e, i, tag, fi, pi, fl, pl, wl, g, h, t, mf, mp, fil, pil, el
      ORDER BY e.start_time DESC
      LIMIT toInteger($limit)
    `

    const result = await runCypher(cypher, params)

    // Transform Neo4j records to graph format
    const nodes = new Map()
    const edges = []

    result.records.forEach(record => {
      // Camera node
      const camera = record.get('c')
      if (camera) {
        const cameraId = camera.properties.id
        if (cameraId && !nodes.has(cameraId)) {
          nodes.set(cameraId, {
            id: cameraId,
            label: camera.properties.name || cameraId,
            type: 'Camera',
            properties: camera.properties
          })
        }
      }

      // Event node
      const event = record.get('e')
      if (event) {
        const eventId = event.properties.id
        if (eventId && !nodes.has(eventId)) {
          nodes.set(eventId, {
            id: eventId,
            label: `${event.properties.topic || 'Event'} ${eventId}`,
            type: 'Event',
            properties: event.properties
          })
        }
      }

      // Image node (use url/path as id fallback)
      const image = record.get('i')
      if (image) {
        const imgProps = image.properties || {}
        const imageId = imgProps.id || imgProps.url || imgProps.path
        if (imageId && !nodes.has(imageId)) {
          nodes.set(imageId, {
            id: imageId,
            label: `Snapshot ${String(imgProps.type || '')}`.trim(),
            type: 'Image',
            properties: imgProps
          })
        }
      }

      // Tag node (by name)
      const tag = record.get('tag')
      if (tag) {
        const name = tag.properties.name
        const tagId = name ? `tag_${name}` : null
        if (tagId && !nodes.has(tagId)) {
          nodes.set(tagId, {
            id: tagId,
            label: name || 'Tag',
            type: 'Tag',
            properties: tag.properties
          })
        }
      }

      // FaceIdentity node
      const face = record.get('fi')
      if (face) {
        const faceId = face.properties.id
        if (faceId && !nodes.has(faceId)) {
          nodes.set(faceId, {
            id: faceId,
            label: face.properties.first_name || face.properties.last_name ? `${face.properties.first_name || ''} ${face.properties.last_name || ''}`.trim() : `Face ${faceId}`,
            type: 'FaceIdentity',
            properties: face.properties
          })
        }
      }

      // PlateIdentity node
      const plate = record.get('pi')
      if (plate) {
        const plateId = plate.properties.id
        if (plateId && !nodes.has(plateId)) {
          nodes.set(plateId, {
            id: plateId,
            label: plate.properties.number || `Plate ${plateId}`,
            type: 'PlateIdentity',
            properties: plate.properties
          })
        }
      }

      // Watchlist nodes (from various matches)
      const fl = record.get('fl')
      if (fl) {
        const wlId = fl.properties.id || fl.properties.name
        if (wlId && !nodes.has(wlId)) {
          nodes.set(wlId, {
            id: wlId,
            label: fl.properties.name || wlId,
            type: 'Watchlist',
            properties: fl.properties
          })
        }
      }
      const pl = record.get('pl')
      if (pl) {
        const wlId = pl.properties.id || pl.properties.name
        if (wlId && !nodes.has(wlId)) {
          nodes.set(wlId, {
            id: wlId,
            label: pl.properties.name || wlId,
            type: 'Watchlist',
            properties: pl.properties
          })
        }
      }
      const wl = record.get('wl')
      if (wl) {
        const wlId = wl.properties.id || wl.properties.name
        if (wlId && !nodes.has(wlId)) {
          nodes.set(wlId, {
            id: wlId,
            label: wl.properties.name || wlId,
            type: 'Watchlist',
            properties: wl.properties
          })
        }
      }

      // Relationships
      const generated = record.get('g')
      if (generated && camera && event) {
        edges.push({
          source: camera.properties.id,
          target: event.properties.id,
          type: 'GENERATED',
          label: 'GENERATED'
        })
      }

      const hasSnapshot = record.get('h')
      if (hasSnapshot && event && image) {
        const imgProps = image.properties || {}
        const imageId = imgProps.id || imgProps.url || imgProps.path
        if (imageId) {
          edges.push({
            source: event.properties.id,
            target: imageId,
            type: 'HAS_SNAPSHOT',
            label: 'HAS_SNAPSHOT'
          })
        }
      }

      const tagged = record.get('t')
      if (tagged && event && tag) {
        const name = tag.properties.name
        if (name) {
          edges.push({
            source: event.properties.id,
            target: `tag_${name}`,
            type: 'TAGGED',
            label: 'TAGGED'
          })
        }
      }

      const mf = record.get('mf')
      if (mf && event && face) {
        edges.push({
          source: event.properties.id,
          target: face.properties.id,
          type: 'MATCHED_FACE',
          label: 'MATCHED_FACE'
        })
      }

      const fil = record.get('fil')
      if (fil && face && fl) {
        const wlId = fl.properties.id || fl.properties.name
        if (wlId) {
          edges.push({
            source: face.properties.id,
            target: wlId,
            type: 'IN_LIST',
            label: 'IN_LIST'
          })
        }
      }

      const mp = record.get('mp')
      if (mp && event && plate) {
        edges.push({
          source: event.properties.id,
          target: plate.properties.id,
          type: 'MATCHED_PLATE',
          label: 'MATCHED_PLATE'
        })
      }

      const pil = record.get('pil')
      if (pil && plate && pl) {
        const wlId = pl.properties.id || pl.properties.name
        if (wlId) {
          edges.push({
            source: plate.properties.id,
            target: wlId,
            type: 'IN_LIST',
            label: 'IN_LIST'
          })
        }
      }

      const el = record.get('el')
      if (el && event && wl) {
        const wlId = wl.properties.id || wl.properties.name
        if (wlId) {
          edges.push({
            source: event.properties.id,
            target: wlId,
            type: 'IN_LIST',
            label: 'IN_LIST'
          })
        }
      }
    })

    const graphData = {
      nodes: Array.from(nodes.values()),
      edges: edges,
      timestamp: new Date().toISOString()
    }

    res.json(graphData)

  } catch (e) {
    console.error('graph error', e)
    res.status(500).json({ error: 'Failed to fetch graph data' })
  }
}))
