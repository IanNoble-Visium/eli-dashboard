import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query, toMillisAgo } from '../_lib/db.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = (req.query.timeRange || '30m')
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))

    const params = useAbsolute ? [startTs, endParam] : [startTs]
    const andEnd = useAbsolute ? ' AND start_time <= $2' : ''

    // Events by level
    const eventsByLevelSql = `
      SELECT COALESCE(level, 'UNKNOWN') AS level, COUNT(*)::int AS count
      FROM events
      WHERE start_time >= $1${andEnd}
      GROUP BY level
      ORDER BY count DESC
    `
    const eventsByLevel = await query(eventsByLevelSql, params)

    // Top topics
    const topTopicsSql = `
      SELECT COALESCE(topic, 'UNKNOWN') AS topic, COUNT(*)::int AS count
      FROM events
      WHERE start_time >= $1${andEnd} AND topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `
    const topTopics = await query(topTopicsSql, params)

    // Top cameras by events
    const topCamerasSql = `
      SELECT channel_id, channel_name, COUNT(*)::int AS count
      FROM events
      WHERE start_time >= $1${andEnd} AND channel_id IS NOT NULL
      GROUP BY channel_id, channel_name
      ORDER BY count DESC
      LIMIT 10
    `
    const topCameras = await query(topCamerasSql, params)

    // Snapshots by type within time window (join on events for time)
    const snapsByTypeSql = `
      SELECT s.type, COUNT(*)::int AS count
      FROM snapshots s
      JOIN events e ON e.id = s.event_id
      WHERE e.start_time >= $1${andEnd}
      GROUP BY s.type
      ORDER BY count DESC
    `
    const snapsByType = await query(snapsByTypeSql, params)

    res.json({
      timeRange,
      window: {
        start: startTs,
        end: useAbsolute ? endParam : Date.now()
      },
      eventsByLevel: eventsByLevel.rows || [],
      topTopics: topTopics.rows || [],
      topCameras: topCameras.rows || [],
      snapshotsByType: snapsByType.rows || [],
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('analytics error', e)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}))

