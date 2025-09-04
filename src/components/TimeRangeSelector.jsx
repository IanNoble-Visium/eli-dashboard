import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useTimeRange } from '@/context/TimeRangeContext'
import { useAuth } from '@/context/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

const PRESETS = [
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '12h', value: '12h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
]
const Bars = ({ bins }) => {
  if (!bins || bins.length === 0) return <div className="text-xs text-muted-foreground">No activity data</div>
  const max = Math.max(1, ...bins.map(b => b.v))
  const widthPct = 100 / bins.length
  return (
    <div className="h-16 w-full flex items-end gap-[2px]">
      {bins.map((b, i) => {
        const pct = Math.round((b.v / max) * 100)
        return <div key={i} className="bg-primary/60" style={{ height: `${pct}%`, width: `${widthPct}%` }} />
      })}
    </div>
  )
}

const Histogram = React.memo(function Histogram({ bins }) {
  return <Bars bins={bins} />
})


export default function TimeRangeSelector({ className }) {
  const { timeRange, setTimeRange, setAbsoluteRange, clearAbsoluteRange } = useTimeRange()
  const { authFetch, isAuthenticated } = useAuth()
  const [bins, setBins] = useState([])
  const [rangePct, setRangePct] = useState([0, 100])

  const lastSentRef = useRef([0, 100])

  // Fetch timeline histogram for the chosen preset. This is lightweight and cached by browser.
  useEffect(() => {
    if (!isAuthenticated) return

    const ctrl = new AbortController()
    authFetch(`${API_BASE}/dashboard/timeline?timeRange=${encodeURIComponent(timeRange)}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('timeline fetch failed')))
      .then(data => setBins((data.data || []).map(d => ({ t: new Date(d.time_bucket).getTime(), v: Number(d.event_count) || 0 }))))
      .catch(() => {})
    return () => ctrl.abort()
  }, [timeRange, isAuthenticated, authFetch])

  // Reset absolute range when preset changes or user selects full range
  useEffect(() => {
    setRangePct([0, 100])
    clearAbsoluteRange()
  }, [timeRange])

  const total = useMemo(() => bins.reduce((s, b) => s + b.v, 0), [bins])
  const filteredTotal = useMemo(() => {
    if (!bins.length) return 0
    const span = bins[bins.length - 1].t - bins[0].t
    const lo = bins[0].t + span * (rangePct[0] / 100)
    const hi = bins[0].t + span * (rangePct[1] / 100)
    let sum = 0
    for (let i = 0; i < bins.length; i++) {
      const t = bins[i].t
      if (t >= lo && t <= hi) sum += bins[i].v
    }
    return sum
  }, [bins, rangePct])

  // As the handles move, publish an absoluteRange override (debounced at context level).
  // Important: this effect runs only on slider changes; publishing to context is cheap.
  useEffect(() => {
    if (bins.length < 2) return

    // Avoid spamming context updates when slider value hasn't meaningfully changed
    const [prevL, prevR] = lastSentRef.current
    const [curL, curR] = rangePct
    const delta = Math.abs(curL - prevL) + Math.abs(curR - prevR)

    if (curL === 0 && curR === 100) {
      lastSentRef.current = [curL, curR]
      clearAbsoluteRange()
      return
    }

    // Only publish if handle moved more than 1% combined since last publish
    if (delta < 1) return

    lastSentRef.current = [curL, curR]

    const span = bins[bins.length - 1].t - bins[0].t
    const start = bins[0].t + span * (curL / 100)
    const end = bins[0].t + span * (curR / 100)
    setAbsoluteRange({ start: Math.floor(start), end: Math.floor(end) })
  }, [rangePct, bins, clearAbsoluteRange, setAbsoluteRange])

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map(p => (
          <Button key={p.value} size="sm" variant={timeRange === p.value ? 'default' : 'outline'} onClick={() => setTimeRange(p.value)}>
            Last {p.label}
          </Button>
        ))}
        <div className="text-xs text-muted-foreground ml-auto">{filteredTotal.toLocaleString()} / {total.toLocaleString()} events in view</div>
      </div>

      <Card className="mt-3">
        <CardContent className="pt-4">
          {/* Histogram bars */}
          <Histogram bins={bins} />

          {/* Dual slider percentage selection over the shown preset period */}
          <div className="mt-3">
            <Slider value={rangePct} min={0} max={100} onValueChange={setRangePct} />
            <div className="text-xs text-muted-foreground mt-1">Zoom the handles to focus on peaks</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

