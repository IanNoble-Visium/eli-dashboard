import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query, toMillisAgo } from '../_lib/db.js'

function robustZScores(values) {
  if (!values?.length) return []
  const median = values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)]
  const mad = values.reduce((acc,v)=>acc+Math.abs(v-median),0)/values.length || 1
  return values.map(v => (v - median) / (1.4826 * mad))
}

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '30m'
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))
    const windowEnd = useAbsolute ? endParam : Date.now()

    // Minute-level aggregation of events
    const seriesSql = `
      SELECT to_timestamp(floor(start_time/60000)*60000) at time zone 'utc' AS ts,
             COUNT(*)::int AS count
      FROM events
      WHERE start_time >= $1 AND start_time <= $2
      GROUP BY ts
      ORDER BY ts`
    const seriesRes = await query(seriesSql, [startTs, windowEnd])
    const points = seriesRes.rows.map(r => ({ t: new Date(r.ts).toISOString(), y: Number(r.count) }))

    const z = robustZScores(points.map(p => p.y))
    const scored = points.map((p, i) => ({ ...p, score: Math.abs(z[i]) }))

    // Persist recent top outliers to ai_anomalies for realtime streaming
    const recent = scored.slice(-10)
    const threshold = 3.0
    const toSave = recent.filter(p => p.score >= threshold)
    if (toSave.length) {
      const now = Date.now()
      const values = []
      const params = []
      let idx = 1
      for (const p of toSave) {
        values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`)
        params.push('events_per_min', 'channel', null, p.y, p.score, threshold, JSON.stringify({ start: startTs, end: windowEnd }), JSON.stringify({ method: 'robust_z' }), new Date(p.t).getTime())
      }
      const sql = `INSERT INTO ai_anomalies (metric, entity_type, entity_id, value, score, threshold, window, context, ts) VALUES ${values.join(',')}`
      await query(sql, params)
    }

    // Top outliers (response)
    const top = scored
      .slice()
      .sort((a,b)=>b.score-a.score)
      .slice(0, 10)

    res.json({
      status: 'ok',
      window: { start: startTs, end: windowEnd },
      series: scored,
      topOutliers: top,
      thresholdHint: threshold,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[ai/anomaly] error', e)
    res.status(500).json({ error: 'Anomaly detection failed' })
  }
}))

