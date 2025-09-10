import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import TinyPresetBar from '@/components/TinyPresetBar'
import { useTimeRange } from '@/context/TimeRangeContext'
import { useAuth } from '@/context/AuthContext'

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

export default function AiAnalytics() {
  const { debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const params = new URLSearchParams()
  if (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end) {
    params.set('start', String(debouncedAbsoluteRange.start))
    params.set('end', String(debouncedAbsoluteRange.end))
  } else {
    params.set('timeRange', debouncedTimeRange)
  }

  const predictive = useAuthedJson(`${API_BASE}/ai/predictive?${params.toString()}`)
  const behavior = useAuthedJson(`${API_BASE}/ai/behavior?${params.toString()}`)
  const anomaly = useAuthedJson(`${API_BASE}/ai/anomaly?${params.toString()}`)

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
        </TabsList>

        <TabsContent value="predictive" className="space-y-4">
          {predictive.loading && <Skeleton className="h-64 w-full" />}
          {predictive.error && <Card><CardContent className="p-4 text-destructive">Error: {predictive.error}</CardContent></Card>}
          {predictive.data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ForecastChart title="Event Forecast" series={predictive.data.inputs.eventSeries} forecast={predictive.data.forecasts.events} />
              <ForecastChart title="Traffic Flow Forecast" series={predictive.data.inputs.flowSeries} forecast={predictive.data.forecasts.flow} />
              <ForecastChart title="Cloudflare Requests Forecast" series={predictive.data.inputs.trafficSeries} forecast={predictive.data.forecasts.traffic} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          {behavior.loading && <Skeleton className="h-48 w-full" />}
          {behavior.error && <Card><CardContent className="p-4 text-destructive">Error: {behavior.error}</CardContent></Card>}
          {behavior.data && (
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
      </Tabs>
    </div>
  )
}

