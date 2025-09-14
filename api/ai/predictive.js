import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query, toMillisAgo } from '../_lib/db.js'
import { runCypher } from '../_lib/neo4j.js'
import { forecastSeries } from '../_lib/vertex.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '30m'
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))
    const windowEnd = useAbsolute ? endParam : Date.now()

    // 1) Postgres: aggregate events by minute
    const eventsSql = `
      SELECT to_timestamp(floor(start_time/60000)*60000) at time zone 'utc' AS ts,
             COUNT(*)::int AS count
      FROM events
      WHERE start_time >= $1 AND start_time <= $2
      GROUP BY ts
      ORDER BY ts`
    const events = await query(eventsSql, [startTs, windowEnd])
    const eventSeries = events.rows.map(r => ({ t: new Date(r.ts).toISOString(), y: Number(r.count) }))

    // 2) Neo4j: relationship creation rate (proxy for flow)
    const cypher = `
      MATCH ()-[e:EDGE]-() WHERE e.timestamp >= $start AND e.timestamp <= $end
      WITH e, datetime({ epochMillis: e.timestamp }) AS dt
      RETURN toString(datetime({year:dt.year,month:dt.month,day:dt.day,hour:dt.hour,minute:dt.minute})) AS ts, count(e) AS count
      ORDER BY ts`
    const graphRes = await runCypher(cypher, { start: startTs, end: windowEnd })
    const flowSeries = graphRes.records.map(r => ({ t: new Date(r.get('ts')).toISOString(), y: Number(r.get('count')) }))

    // Forecast via Vertex (traffic series removed; Cloudflare dependency dropped)
    const [eventsFc, flowFc] = await Promise.all([
      forecastSeries({ series: eventSeries }),
      forecastSeries({ series: flowSeries }),
    ])

    res.json({
      status: 'ok',
      window: { start: startTs, end: windowEnd },
      inputs: {
        eventSeries,
        flowSeries,
      },
      forecasts: {
        events: eventsFc.output?.forecast || [],
        flow: flowFc.output?.forecast || [],
      },
      warnings: [eventsFc.error, flowFc.error].filter(Boolean),
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[ai/predictive] error', e)
    res.status(500).json({ error: 'Predictive analytics failed' })
  }
}))

