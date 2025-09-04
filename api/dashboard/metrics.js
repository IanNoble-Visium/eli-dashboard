import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query, toMillisAgo } from '../_lib/db.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = (req.query.timeRange || '24h')
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))

    const recentParams = useAbsolute ? [startTs, endParam] : [startTs]

    const eventsQuery = `
      SELECT COUNT(*) as total_events,
             COUNT(CASE WHEN start_time >= $1${useAbsolute ? ' AND start_time <= $2' : ''} THEN 1 END) as recent_events
      FROM events
    `
    const events = await query(eventsQuery, recentParams)

    const typesQuery = `
      SELECT topic, COUNT(*) as count
      FROM events
      WHERE start_time >= $1${useAbsolute ? ' AND start_time <= $2' : ''} AND topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `
    const types = await query(typesQuery, recentParams)

    const geoQuery = `
      SELECT
        CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 'with_location'
             ELSE 'without_location' END as location_status,
        COUNT(*) as count
      FROM events
      WHERE start_time >= $1${useAbsolute ? ' AND start_time <= $2' : ''}
      GROUP BY location_status
    `
    const geo = await query(geoQuery, recentParams)

    const cameraQuery = `
      SELECT channel_id, channel_name, COUNT(*) as event_count
      FROM events
      WHERE start_time >= $1${useAbsolute ? ' AND start_time <= $2' : ''} AND channel_id IS NOT NULL
      GROUP BY channel_id, channel_name
      ORDER BY event_count DESC
      LIMIT 10
    `
    const camera = await query(cameraQuery, recentParams)

    const snapQuery = `
      SELECT COUNT(*) as total_snapshots,
             COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as with_images
      FROM snapshots s
      JOIN events e ON s.event_id = e.id
      WHERE e.start_time >= $1${useAbsolute ? ' AND e.start_time <= $2' : ''}
    `
    const snaps = await query(snapQuery, recentParams)

    res.json({
      timeRange,
      totalEvents: Number(events.rows?.[0]?.total_events || 0),
      recentEvents: Number(events.rows?.[0]?.recent_events || 0),
      eventTypes: types.rows || [],
      geoDistribution: geo.rows || [],
      cameraActivity: camera.rows || [],
      totalSnapshots: Number(snaps.rows?.[0]?.total_snapshots || 0),
      snapshotsWithImages: Number(snaps.rows?.[0]?.with_images || 0),
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('metrics error', e)
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' })
  }
}))

