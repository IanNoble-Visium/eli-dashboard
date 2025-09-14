import { withCors } from '../_lib/cors.js'
import { withAuth } from '../_lib/auth.js'
import { query, toMillisAgo } from '../_lib/db.js'

export default withCors(withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    const startParam = req.query.start ? parseInt(req.query.start, 10) : null
    const endParam = req.query.end ? parseInt(req.query.end, 10) : null
    const timeRange = req.query.timeRange || '30m'
    const useAbsolute = Boolean(startParam && endParam)
    const startTs = useAbsolute ? startParam : Math.floor(toMillisAgo(timeRange))
    const endTs = useAbsolute ? endParam : Date.now()
    const channelId = req.query.channel_id || null

    // Thresholds (defaults); allow client overrides via query
    const ratePct = Math.min(Math.max(Number(req.query.threshold_rate_pct ?? 0.4), 0), 1)
    const confBelowPct = Math.min(Math.max(Number(req.query.threshold_conf_below_pct ?? 0.2), 0), 1)
    const anomPerHour = Math.max(parseInt(req.query.threshold_anom_per_hour ?? '5', 10), 1)

    // Detection confidence per minute and counts by type
    const detSeriesSql = `
      SELECT to_timestamp(floor(ts/60000)*60) at time zone 'utc' AS ts,
             type,
             AVG(score)::float AS avg_score,
             COUNT(*)::int AS count
      FROM ai_detections
      WHERE ts BETWEEN $1 AND $2 AND ($3::text IS NULL OR channel_id = $3)
      GROUP BY ts, type
      ORDER BY ts`
    const detSeriesRes = await query(detSeriesSql, [startTs, endTs, channelId])

    // Window totals for person/vehicle counts
    const detTotalsSql = `
      SELECT type, COUNT(*)::int AS cnt
      FROM ai_detections
      WHERE ts BETWEEN $1 AND $2 AND type IN ('person','vehicle') AND ($3::text IS NULL OR channel_id = $3)
      GROUP BY type`
    const detTotalsRes = await query(detTotalsSql, [startTs, endTs, channelId])

    // Build confidence series keyed by minute
    const detRows = detSeriesRes.rows
    const byMinute = new Map()
    for (const r of detRows) {
      const t = new Date(r.ts).toISOString()
      const key = t
      const cur = byMinute.get(key) || { t }
      if (r.type === 'person') { cur.personAvg = Number(r.avg_score) }
      else if (r.type === 'vehicle') { cur.vehicleAvg = Number(r.avg_score) }
      else { cur.otherAvg = Number(r.avg_score) }
      byMinute.set(key, cur)
    }
    const confidenceSeries = Array.from(byMinute.values()).sort((a,b)=>a.t.localeCompare(b.t))

    // Person/vehicle ratio series per minute
    const detCountsSeriesSql = `
      SELECT to_timestamp(floor(ts/60000)*60) at time zone 'utc' AS ts,
             type,
             COUNT(*)::int AS cnt
      FROM ai_detections
      WHERE ts BETWEEN $1 AND $2 AND type IN ('person','vehicle') AND ($3::text IS NULL OR channel_id = $3)
      GROUP BY ts, type
      ORDER BY ts`
    const detCountsSeries = await query(detCountsSeriesSql, [startTs, endTs, channelId])
    const ratioMap = new Map()
    for (const r of detCountsSeries.rows) {
      const t = new Date(r.ts).toISOString()
      const cur = ratioMap.get(t) || { t, person: 0, vehicle: 0 }
      if (r.type === 'person') cur.person = Number(r.cnt)
      else if (r.type === 'vehicle') cur.vehicle = Number(r.cnt)
      ratioMap.set(t, cur)
    }
    const ratioSeries = Array.from(ratioMap.values()).map(x => ({ t: x.t, ratio: (x.person + x.vehicle) ? x.person / (x.person + x.vehicle) : 0 }))

    const totalPerson = Number(detTotalsRes.rows.find(r => r.type === 'person')?.cnt || 0)
    const totalVehicle = Number(detTotalsRes.rows.find(r => r.type === 'vehicle')?.cnt || 0)

    // Jobs throughput and latency/success metrics
    const jobsThroughputSql = `
      SELECT to_timestamp(floor(updated_at/60000)*60) at time zone 'utc' AS ts,
             COUNT(*)::int AS completed
      FROM ai_inference_jobs
      WHERE status = 'done' AND updated_at BETWEEN $1 AND $2
      GROUP BY ts
      ORDER BY ts`
    const jobsThroughput = await query(jobsThroughputSql, [startTs, endTs])

    const jobsDurationsSql = `
      SELECT (updated_at - created_at) AS dur
      FROM ai_inference_jobs
      WHERE status = 'done' AND updated_at BETWEEN $1 AND $2`
    const jobsDurations = await query(jobsDurationsSql, [startTs, endTs])
    const durations = jobsDurations.rows.map(r => Number(r.dur)).filter(n => Number.isFinite(n)).sort((a,b)=>a-b)
    const pct = (arr, p) => arr.length ? arr[Math.min(arr.length-1, Math.floor(p * arr.length))] : null
    const p50 = pct(durations, 0.5)
    const p90 = pct(durations, 0.9)
    const p95 = pct(durations, 0.95)

    const jobsStatusSql = `
      SELECT status, COUNT(*)::int AS cnt
      FROM ai_inference_jobs
      WHERE updated_at BETWEEN $1 AND $2 AND status IN ('done','error')
      GROUP BY status`
    const jobsStatus = await query(jobsStatusSql, [startTs, endTs])
    const done = Number(jobsStatus.rows.find(r => r.status === 'done')?.cnt || 0)
    const err = Number(jobsStatus.rows.find(r => r.status === 'error')?.cnt || 0)
    const successRate = (done + err) ? done / (done + err) : null

    // Patterns: hour-of-day histogram
    const hourHistSql = `
      SELECT EXTRACT(HOUR FROM to_timestamp(ts/1000))::int AS hour, COUNT(*)::int AS count
      FROM ai_detections
      WHERE ts BETWEEN $1 AND $2 AND ($3::text IS NULL OR channel_id = $3)
      GROUP BY hour
      ORDER BY hour`
    const hourHist = await query(hourHistSql, [startTs, endTs, channelId])

    // Channel hotspots (top channels by detections)
    const hotspotsSql = `
      SELECT d.channel_id,
             COALESCE(MAX(e.channel_name), d.channel_id) AS channel_name,
             COUNT(*)::int AS count
      FROM ai_detections d
      LEFT JOIN events e ON e.channel_id = d.channel_id AND e.start_time BETWEEN $1 AND $2
      WHERE d.ts BETWEEN $1 AND $2
      GROUP BY d.channel_id
      ORDER BY count DESC
      LIMIT 10`
    const hotspots = await query(hotspotsSql, [startTs, endTs])

    // Confidence histogram (0-1 in 10 buckets)
    const confHistSql = `
      SELECT width_bucket(score, 0.0, 1.0, 10) AS bkt, COUNT(*)::int AS count
      FROM ai_detections
      WHERE ts BETWEEN $1 AND $2 AND ($3::text IS NULL OR channel_id = $3)
      GROUP BY bkt
      ORDER BY bkt`
    const confHist = await query(confHistSql, [startTs, endTs, channelId])

    // Baseline over a long window (7d)
    const longStart = endTs - 7 * 24 * 60 * 60 * 1000
    const baselineSql = `
      SELECT type, AVG(score)::float AS avg_score
      FROM ai_detections
      WHERE ts BETWEEN $1 AND $2 AND ($3::text IS NULL OR channel_id = $3)
      GROUP BY type`
    const baselineRes = await query(baselineSql, [longStart, endTs, channelId])
    const baseline = { personAvg: null, vehicleAvg: null, otherAvg: null }
    for (const r of baselineRes.rows) {
      if (r.type === 'person') baseline.personAvg = Number(r.avg_score)
      else if (r.type === 'vehicle') baseline.vehicleAvg = Number(r.avg_score)
      else baseline.otherAvg = Number(r.avg_score)
    }

    // Build totals and trends
    const totalDetections = detRows.reduce((acc, r) => acc + Number(r.count || 0), 0)
    const totalSeriesMap = new Map()
    for (const r of detCountsSeries.rows) {
      const t = new Date(r.ts).toISOString()
      const prev = totalSeriesMap.get(t) || 0
      totalSeriesMap.set(t, prev + Number(r.cnt))
    }
    const totalSeries = Array.from(totalSeriesMap.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([t, count]) => ({ t, count }))
    const half = Math.floor(totalSeries.length / 2)
    const firstAvg = average(totalSeries.slice(0, half).map(x => x.count)) || 0
    const lastAvg = average(totalSeries.slice(half).map(x => x.count)) || 0
    const trendDelta = lastAvg - firstAvg
    const trendPct = firstAvg ? (trendDelta / firstAvg) : null

    // Velocity (first derivative) and momentum (acceleration) of detections per minute
    const velocity = []
    const acceleration = []
    for (let i=1;i<totalSeries.length;i++) {
      const v = totalSeries[i].count - totalSeries[i-1].count
      velocity.push({ t: totalSeries[i].t, v })
      if (i>1) acceleration.push( v - (totalSeries[i-1].count - totalSeries[i-2].count) )
    }
    const momentum = acceleration.length ? average(acceleration.map(Number)) : 0

    // Anomaly severity distribution
    const sevSql = `
      SELECT
        CASE
          WHEN score < 1 THEN '0-1'
          WHEN score < 2 THEN '1-2'
          WHEN score < 3 THEN '2-3'
          ELSE '3+'
        END AS bin,
        COUNT(*)::int AS count
      FROM ai_anomalies
      WHERE ts BETWEEN $1 AND $2 AND ($3::text IS NULL OR (entity_type = 'channel' AND entity_id = $3))
      GROUP BY bin
      ORDER BY bin`
    const severity = await query(sevSql, [startTs, endTs, channelId])

    // Alerts: evaluate thresholds
    const alerts = []
    const alertsDetailed = []

    // Trend-based alert (rate change)
    if (trendPct != null && Math.abs(trendPct) > ratePct) {
      const sev = Math.abs(trendPct) > ratePct * 2 ? 'high' : 'medium'
      const title = trendPct > 0 ? 'Rising detections' : 'Falling detections'
      const msg = `${Math.round(Math.abs(trendPct)*100)}% change vs period average`
      alerts.push(title)
      alertsDetailed.push({ id: `trend:${startTs}:${endTs}`, severity: sev, title, message: msg, ts: endTs, channel_id: channelId || null, kind: 'trend', pct: trendPct })
    }

    // Confidence deviation vs baseline (per-type)
    const overallPerson = average(confidenceSeries.map(x => x.personAvg).filter(Number.isFinite))
    const overallVehicle = average(confidenceSeries.map(x => x.vehicleAvg).filter(Number.isFinite))
    const confAlerts = []
    if (baseline.personAvg && overallPerson!=null) {
      const drop = (baseline.personAvg - overallPerson) / baseline.personAvg
      if (drop > confBelowPct) confAlerts.push({ type: 'person', drop })
    }
    if (baseline.vehicleAvg && overallVehicle!=null) {
      const drop = (baseline.vehicleAvg - overallVehicle) / baseline.vehicleAvg
      if (drop > confBelowPct) confAlerts.push({ type: 'vehicle', drop })
    }
    for (const a of confAlerts) {
      const sev = a.drop > confBelowPct * 2 ? 'high' : 'medium'
      const title = `${a.type} confidence below baseline`
      const message = `${Math.round(a.drop*100)}% below baseline`
      alerts.push(title)
      alertsDetailed.push({ id: `conf:${a.type}:${endTs}`, severity: sev, title, message, ts: endTs, channel_id: channelId || null, kind: 'confidence', drop: a.drop, type: a.type })
    }

    // Anomalies per last hour
    const anHourAgo = endTs - 60*60*1000
    const anHourSql = `SELECT COUNT(*)::int AS cnt FROM ai_anomalies WHERE ts >= $1 AND ($2::text IS NULL OR (entity_type='channel' AND entity_id=$2))`
    const anHourRes = await query(anHourSql, [anHourAgo, channelId])
    const hourCnt = Number(anHourRes.rows[0]?.cnt || 0)
    if (hourCnt > anomPerHour) {
      const sev = hourCnt > (anomPerHour*2) ? 'high' : 'medium'
      const title = 'High anomaly rate'
      const message = `${hourCnt} anomalies in the last hour`
      alerts.push(title)
      alertsDetailed.push({ id: `anom:${endTs}`, severity: sev, title, message, ts: endTs, channel_id: channelId || null, kind: 'anomaly_rate', count: hourCnt })
    }

    res.json({
      status: 'ok',
      window: { start: startTs, end: endTs },
      detectionConfidence: {
        series: confidenceSeries,
        overall: {
          personAvg: overallPerson,
          vehicleAvg: overallVehicle,
          otherAvg: average(confidenceSeries.map(x => x.otherAvg).filter(Number.isFinite)),
        },
        baseline,
        deviation: {
          personBelowPct: (baseline.personAvg && overallPerson!=null && baseline.personAvg>0) ? (baseline.personAvg - overallPerson)/baseline.personAvg : null,
          vehicleBelowPct: (baseline.vehicleAvg && overallVehicle!=null && baseline.vehicleAvg>0) ? (baseline.vehicleAvg - overallVehicle)/baseline.vehicleAvg : null,
        },
        histogram: confHist.rows.map(r => ({ bin: Number(r.bkt), count: Number(r.count) }))
      },
      detectionRatio: {
        person: totalPerson,
        vehicle: totalVehicle,
        total: totalPerson + totalVehicle,
        ratio: (totalPerson + totalVehicle) ? totalPerson / (totalPerson + totalVehicle) : null,
        series: ratioSeries,
      },
      totals: {
        detections: totalDetections,
        perMinute: totalSeries,
        velocity,
        momentum,
        trend: { delta: trendDelta, pct: trendPct }
      },
      jobs: {
        throughput: jobsThroughput.rows.map(r => ({ t: new Date(r.ts).toISOString(), count: Number(r.completed) })),
        latencyMs: { p50, p90, p95 },
        successRate,
      },
      patterns: {
        hourHistogram: hourHist.rows.map(r => ({ hour: Number(r.hour), count: Number(r.count) })),
        hotspots: hotspots.rows.map(r => ({ channel_id: r.channel_id, channel_name: r.channel_name, count: Number(r.count) })),
      },
      anomalies: {
        severityHistogram: severity.rows.map(r => ({ bin: r.bin, count: Number(r.count) })),
      },
      alerts,
      alertsDetailed,
      thresholds: { ratePct, confBelowPct, anomPerHour },
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[ai/metrics] error', e)
    res.status(500).json({ error: 'AI metrics failed' })
  }
}))

function average(arr) {
  if (!arr?.length) return null
  const s = arr.reduce((a,b)=>a + b, 0)
  return s / arr.length
}

