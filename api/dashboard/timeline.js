const { withCors } = require('../_lib/cors.js')
const { query, toMillisAgo } = require('../_lib/db.js')

module.exports = withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const timeRange = (req.query.timeRange || '24h')
    const eventType = req.query.eventType
    const cameraId = req.query.cameraId

    const now = Date.now()
    const startTs = Math.floor(toMillisAgo(timeRange))

    let interval = '1 hour'
    if (timeRange === '30m') interval = '5 minutes'
    else if (timeRange === '1h') interval = '10 minutes'
    else if (timeRange === '4h') interval = '30 minutes'
    else if (timeRange === '12h') interval = '1 hour'
    else if (timeRange === '7d') interval = '1 day'
    else if (timeRange === '30d') interval = '1 day'

    const where = ['start_time >= $1']
    const params = [startTs]

    if (eventType) { where.push('topic = $' + (params.length + 1)); params.push(eventType) }
    if (cameraId) { where.push('channel_id = $' + (params.length + 1)); params.push(cameraId) }

    const sql = `
      SELECT 
        TO_TIMESTAMP(start_time / 1000) as time_bucket,
        COUNT(*) as event_count,
        topic
      FROM events
      WHERE ${where.join(' AND ')}
      GROUP BY TO_TIMESTAMP(start_time / 1000), topic
      ORDER BY time_bucket
    `

    const result = await query(sql, params)

    res.json({
      timeRange,
      interval,
      data: result.rows || [],
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('timeline error', e)
    res.status(500).json({ error: 'Failed to fetch timeline data' })
  }
})

