import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, LineChart, Line, BarChart, Bar } from 'recharts'
import TinyPresetBar from '@/components/TinyPresetBar'
import { useTimeRange } from '@/context/TimeRangeContext'
import { useAuth } from '@/context/AuthContext'
import { useAlerts } from '@/context/AlertsContext'
import { Button } from '@/components/ui/button'

// Use same development default as AuthContext to avoid accidental /api calls to Vite dev server
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

function useAuthedJson(url) {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true); setError(null)
      try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e) { if (!cancelled) setError(e.message) } finally { if (!cancelled) setLoading(false) }
    }
    run();
    return () => { cancelled = true }
  }, [url, token])
  return { data, loading, error }
}

function ForecastChart({ title, series, forecast }) {
  const config = useMemo(() => ({
    value: { label: 'count', color: 'hsl(var(--primary))' },
    forecast: { label: 'forecast', color: 'hsl(var(--muted-foreground))' },
  }), [])
  const merged = useMemo(() => {
    const a = (series||[]).map(p => ({ t: p.t, actual: p.y }))
    const b = (forecast||[]).map(p => ({ t: p.t, forecast: p.y }))
    return [...a, ...b]
  }, [series, forecast])
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64">
          <AreaChart data={merged} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" hide />
            <YAxis allowDecimals={false} width={40} />
            <Area type="monotone" dataKey="actual" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.2} />
            <Area type="monotone" dataKey="forecast" stroke="var(--color-forecast)" fill="var(--color-forecast)" fillOpacity={0.1} />
            <ChartTooltip content={<ChartTooltipContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function InsightsFeed() {
  const { token } = useAuth()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState({ loading: true, error: null, data: null })
      try {
        const res = await fetch(`${API_BASE}/ai/insights-feed?scope=channel&limit=30`, { headers: { Authorization: `Bearer ${token}` }})
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        if (!cancelled) setState({ loading: false, error: null, data: json })
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e.message, data: null })
      }
    }
    run()
    return () => { cancelled = true }
  }, [token, refreshKey])

  if (state.loading) return <Skeleton className="h-48 w-full" />
  if (state.error) return (
    <Card>
      <CardHeader><CardTitle>Insights</CardTitle></CardHeader>
      <CardContent className="p-4 text-destructive">Failed to load insights: {state.error}</CardContent>
    </Card>
  )

  const items = state.data?.data || []
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Insights</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setRefreshKey(k => k+1)}>Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <div className="text-sm text-muted-foreground">No insights available yet.</div>}
        {items.map(i => (
          <div key={i.id} className="border rounded-md p-3">
            <div className="text-sm mb-1">{Number.isFinite(Number(i.ts)) ? new Date(Number(i.ts)).toLocaleString() : (i.ts ? String(i.ts) : '')}</div>
            <div className="font-medium mb-1">{i.summary}</div>
            {Array.isArray(i.recommendations) && i.recommendations.length > 0 && (
              <ul className="list-disc ml-5 text-sm">
                {i.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function AiAnalytics() {
  const { debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const { getThresholds, baselineOverlay, addAlerts } = useAlerts()
  const params = new URLSearchParams()
  if (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end) {
    params.set('start', String(debouncedAbsoluteRange.start))
    params.set('end', String(debouncedAbsoluteRange.end))
  } else {
    params.set('timeRange', debouncedTimeRange)
  }

  const [channelId, setChannelId] = useState('')
  const predictive = useAuthedJson(`${API_BASE}/ai/predictive?${params.toString()}`)
  const behavior = useAuthedJson(`${API_BASE}/ai/behavior?${params.toString()}`)
  const anomaly = useAuthedJson(`${API_BASE}/ai/anomaly?${params.toString()}`)
  const cameras = useAuthedJson(`${API_BASE}/events/cameras?${params.toString()}`)
  const thr = getThresholds(channelId || null)
  const thrParams = `&threshold_rate_pct=${encodeURIComponent(thr.ratePct)}&threshold_conf_below_pct=${encodeURIComponent(thr.confBelowPct)}&threshold_anom_per_hour=${encodeURIComponent(thr.anomPerHour)}`
  const metrics = useAuthedJson(`${API_BASE}/ai/metrics?${params.toString()}${channelId?`&channel_id=${encodeURIComponent(channelId)}`:''}${thrParams}`)


  // Merge aggregate alerts from metrics into unified notification center (dedup in context)
  useEffect(() => {
    const list = metrics.data?.alertsDetailed
    if (Array.isArray(list) && list.length) addAlerts(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.data?.timestamp])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI Analytics</h1>
        <div className="w-full max-w-xl"><TinyPresetBar /></div>
      </div>

      <Tabs defaultValue="predictive" className="w-full">
        <TabsList>
          <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger>
          <TabsTrigger value="behavior">Behavioral Analysis</TabsTrigger>
          <TabsTrigger value="anomaly">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="metrics">AI Metrics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="predictive" className="space-y-4">
          {predictive.loading && <Skeleton className="h-64 w-full" />}
          {predictive.error && <Card><CardContent className="p-4 text-destructive">Error: {predictive.error}</CardContent></Card>}
          {predictive.data && (
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
              <ForecastChart title="Event Forecast" series={predictive.data.inputs.eventSeries} forecast={predictive.data.forecasts.events} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          {behavior.loading && <Skeleton className="h-48 w-full" />}
          {behavior.error && <Card><CardContent className="p-4 text-destructive">Error: {behavior.error}</CardContent></Card>}
          {behavior.data && (
            <>
              {(behavior.data.summary || (behavior.data.recommendations||[]).length>0) && (
                <Card>
                  <CardHeader><CardTitle>Behavioral Summary</CardTitle></CardHeader>
                  <CardContent>
                    {behavior.data.summary && <div className="mb-2 text-sm">{behavior.data.summary}</div>}
                    {Array.isArray(behavior.data.recommendations) && behavior.data.recommendations.length>0 && (
                      <ul className="list-disc ml-5 text-sm">
                        {behavior.data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle>Baselines & Deviations</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {behavior.data.baselines.map((b, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="font-medium">{b.label || b.id}</div>
                        <div className="text-xs text-muted-foreground">rate/min: {b.ratePerMin?.toFixed?.(2) ?? '—'} • diversity: {b.topicDiversity ?? '—'}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(b.deviationHints||[]).map((h,i)=> (
                            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{h}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="anomaly" className="space-y-4">
          {anomaly.loading && <Skeleton className="h-48 w-full" />}
          {anomaly.error && <Card><CardContent className="p-4 text-destructive">Error: {anomaly.error}</CardContent></Card>}
          {anomaly.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Anomaly Scores (per minute)</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{ value: { color: 'hsl(var(--primary))' } }} className="h-64">
                    <AreaChart data={anomaly.data.series} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" hide />
                      <YAxis allowDecimals={true} width={40} />
                      <Area type="monotone" dataKey="score" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.2} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Top Outliers</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {anomaly.data.topOutliers.map((o, i) => (
                      <li key={i} className="flex items-center justify-between border rounded-md p-2">
                        <span className="text-sm">{new Date(o.t).toLocaleString()}</span>
                        <span className="text-sm font-mono">z≈{o.score.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">AI Metrics</div>
            <div>
              <select className="border rounded px-2 py-1 text-sm" value={channelId} onChange={e=>setChannelId(e.target.value)}>
                <option value="">All Channels</option>
                {(cameras.data?.cameras||[]).map(c => (
                  <option key={c.channel_id} value={c.channel_id}>{c.channel_name || c.channel_id}</option>
                ))}
              </select>
            </div>
          </div>
          {metrics.loading && <Skeleton className="h-64 w-full" />}
          {metrics.error && <Card><CardContent className="p-4 text-destructive">Error: {metrics.error}</CardContent></Card>}
          {metrics.data && (() => {
            const cams = cameras.data?.cameras || []
            const selectedCam = cams.find(c => c.channel_id === channelId)
            const channelLabel = selectedCam?.channel_name || selectedCam?.channel_id || 'All Channels'
            const timeLabel = (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end)
              ? `${new Date(debouncedAbsoluteRange.start).toLocaleString()} → ${new Date(debouncedAbsoluteRange.end).toLocaleString()}`
              : String(debouncedTimeRange)
            const avgVals = [
              metrics.data.detectionConfidence.overall.personAvg,
              metrics.data.detectionConfidence.overall.vehicleAvg,
              metrics.data.detectionConfidence.overall.otherAvg
            ].filter(v => typeof v === 'number')
            const overallAvg = avgVals.length ? (avgVals.reduce((a,b)=>a+b,0)/avgVals.length) : null
            const base = metrics.data.detectionConfidence.baseline || {}
            const diffPct = (val, baseVal) => (typeof val==='number' && typeof baseVal==='number' && baseVal!==0) ? (val-baseVal)/baseVal : null
            const delta = diffPct(overallAvg, base.personAvg || base.vehicleAvg)
            const arrow = delta==null ? '' : (delta>0 ? '▲' : '▼')
            const confSeries = (metrics.data.detectionConfidence.series||[]).map(p => ({...p, personBase: base.personAvg, vehicleBase: base.vehicleAvg}))
            const confHist = (metrics.data.detectionConfidence.histogram||[]).map(h => ({ label: `${((h.bin-1)/10).toFixed(1)}-${(h.bin/10).toFixed(1)}`, count: h.count }))
            return (
            <>
              <Card>
                <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm"><span className="text-muted-foreground">Channel:</span> <span className="font-medium">{channelLabel}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Window:</span> <span className="font-medium">{timeLabel}</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Detections:</span> <span className="font-medium">{(metrics.data.detectionRatio.total||0).toLocaleString()} (P {metrics.data.detectionRatio.person||0}, V {metrics.data.detectionRatio.vehicle||0})</span></div>
                  <div className="text-sm"><span className="text-muted-foreground">Avg Confidence:</span> <span className="font-medium">{overallAvg?.toFixed?.(2) ?? '—'} {arrow}{delta!=null?` ${Math.abs(delta*100).toFixed(0)}% vs baseline`:''}</span></div>
                  {(() => { const dev = metrics.data?.detectionConfidence?.deviation || {}; return (
                    <div className="flex items-center gap-2 text-xs">
                      {Number.isFinite(dev.personBelowPct) && dev.personBelowPct>0 && (
                        <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded-full">P -{Math.round(dev.personBelowPct*100)}%</span>
                      )}
                      {Number.isFinite(dev.vehicleBelowPct) && dev.vehicleBelowPct>0 && (
                        <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded-full">V -{Math.round(dev.vehicleBelowPct*100)}%</span>
                      )}
                    </div>
                  )})()}
                  {Array.isArray(metrics.data.alerts)&&metrics.data.alerts.length>0 && (
                    <div className="flex flex-wrap gap-1">
                      {metrics.data.alerts.map((a,i)=>(<span key={i} className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">{a}</span>))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {(metrics.data.totals?.velocity||[]).length>0 && (
                <Card>
                  <CardHeader><CardTitle>Detection Velocity</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      {(() => { const v=metrics.data.totals.velocity; const last=v[v.length-1]?.v ?? 0; const mom=metrics.data.totals.momentum ?? 0; return (
                        <>
                          <div><span className="text-muted-foreground">Last Δ/min:</span> <span className="font-medium">{last>0?'▲':(last<0?'▼':'•')} {Math.round(last)}</span></div>
                          <div><span className="text-muted-foreground">Momentum:</span> <span className={`font-medium ${mom>0?'text-emerald-600':(mom<0?'text-red-600':'')}`}>{mom>0?'▲':(mom<0?'▼':'•')} {Math.round(mom)}</span></div>
                        </>
                      )})()}
                    </div>
                    <ChartContainer config={{ vel: { label: 'Δ detections/min', color: 'hsl(var(--primary))' } }} className="h-20">
                      <AreaChart data={metrics.data.totals.velocity} margin={{ left: 12, right: 12, top: 4, bottom: 4 }}>
                        <XAxis dataKey="t" hide />
                        <YAxis hide />
                        <Area type="monotone" dataKey="v" stroke="var(--color-vel)" fill="var(--color-vel)" fillOpacity={0.15} />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Detection Confidence Trends</CardTitle></CardHeader>
                  <CardContent>
                    <ChartContainer config={{ person: { label: 'person', color: 'hsl(var(--primary))' }, vehicle: { label: 'vehicle', color: 'hsl(var(--muted-foreground))' }, pbase: { label: 'baseline(person)', color: '#999' }, vbase: { label: 'baseline(vehicle)', color: '#bbb' } }} className="h-64">
                      <LineChart data={confSeries} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" hide />
                        <YAxis allowDecimals={true} width={40} domain={[0,1]} />
                        <Line type="monotone" dataKey="personAvg" stroke="var(--color-person)" dot={false} />
                        <Line type="monotone" dataKey="vehicleAvg" stroke="var(--color-vehicle)" dot={false} />
                        {baselineOverlay && (<Line type="monotone" dataKey="personBase" stroke="var(--color-pbase)" strokeDasharray="5 5" dot={false} />)}
                        {baselineOverlay && (<Line type="monotone" dataKey="vehicleBase" stroke="var(--color-vbase)" strokeDasharray="5 5" dot={false} />)}
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Person vs Vehicle Ratio</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm mb-2">Persons: {metrics.data.detectionRatio.person.toLocaleString()} • Vehicles: {metrics.data.detectionRatio.vehicle.toLocaleString()}</div>
                    <div className="text-sm mb-2">Ratio (persons / total): {(metrics.data.detectionRatio.ratio ?? 0).toLocaleString(undefined,{ style:'percent', minimumFractionDigits:1 })}</div>
                    <ChartContainer config={{ ratio: { label: 'ratio', color: 'hsl(var(--primary))' } }} className="h-40">
                      <LineChart data={metrics.data.detectionRatio.series} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" hide />
                        <YAxis domain={[0,1]} width={40} />
                        <Line type="monotone" dataKey="ratio" stroke="var(--color-ratio)" dot={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>AI Jobs Performance</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm mb-2">Latency p50: {metrics.data.jobs.latencyMs.p50?.toLocaleString()} ms • p95: {metrics.data.jobs.latencyMs.p95?.toLocaleString()} ms • Success: {(metrics.data.jobs.successRate ?? 0).toLocaleString(undefined,{ style:'percent', minimumFractionDigits:1 })}</div>
                    <ChartContainer config={{ jobs: { label: 'completed/min', color: 'hsl(var(--primary))' } }} className="h-40">
                      <AreaChart data={metrics.data.jobs.throughput} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" hide />
                        <YAxis allowDecimals={false} width={40} />
                        <Area type="monotone" dataKey="count" stroke="var(--color-jobs)" fill="var(--color-jobs)" fillOpacity={0.2} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Confidence Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ChartContainer config={{ hist: { label: 'count', color: 'hsl(var(--primary))' } }} className="h-64">
                      <BarChart data={confHist} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} width={40} />
                        <Bar dataKey="count" fill="var(--color-hist)" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Anomaly Severity</CardTitle></CardHeader>
                  <CardContent>
                    <ChartContainer config={{ sev: { label: 'count', color: 'hsl(var(--primary))' } }} className="h-64">
                      <BarChart data={metrics.data.anomalies.severityHistogram} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bin" />
                        <YAxis allowDecimals={false} width={40} />
                        <Bar dataKey="count" fill="var(--color-sev)" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Peak Detection Hours</CardTitle></CardHeader>
                  <CardContent>
                    <ChartContainer config={{ hour: { label: 'detections', color: 'hsl(var(--primary))' } }} className="h-64">
                      <BarChart data={metrics.data.patterns.hourHistogram} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis allowDecimals={false} width={40} />
                        <Bar dataKey="count" fill="var(--color-hour)" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Hotspots</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {metrics.data.patterns.hotspots.slice(0,5).map(h => (
                        <li key={h.channel_id} className="flex items-center justify-between text-sm">
                          <span>{h.channel_name}</span>
                          <span className="font-mono">{h.count.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
            )})()}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <InsightsFeed />
        </TabsContent>
      </Tabs>
    </div>
  )
}

