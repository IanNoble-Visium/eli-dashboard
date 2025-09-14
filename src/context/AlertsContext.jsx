import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

const DEFAULTS = {
  global: { ratePct: 0.4, confBelowPct: 0.2, anomPerHour: 5 },
  perChannel: {}, // { [channelId]: { ratePct, confBelowPct, anomPerHour } }
}

const THRESH_KEY = 'aiAlertThresholds'
const ACK_KEY = 'aiAckedAlertIds'
const OVERLAY_KEY = 'aiBaselineOverlay'

const AlertsContext = createContext(null)

export function AlertsProvider({ children }) {
  const [thresholds, setThresholdsState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(THRESH_KEY)) || DEFAULTS } catch { return DEFAULTS }
  })
  const [baselineOverlay, setBaselineOverlay] = useState(() => {
    try { const v = localStorage.getItem(OVERLAY_KEY); return v === null ? true : v === 'true' } catch { return true }
  })
  const [alerts, setAlerts] = useState([]) // {id, severity, title, message, ts, channel_id}
  const [acked, setAcked] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(ACK_KEY) || '[]')) } catch { return new Set() }
  })

  // SSE stream of anomalies → alerts
  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/ai/stream`)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        const rows = data?.anomalies || []
        if (!Array.isArray(rows) || rows.length === 0) return
        const mapped = rows.map(r => ({
          id: `anom:${r.id}`,
          severity: r.score >= 3 ? 'high' : (r.score >= 2 ? 'medium' : 'low'),
          title: r.metric || 'Anomaly',
          message: `score ${Number(r.score ?? 0).toFixed(2)} (thr ${Number(r.threshold ?? 0).toFixed(2)})`,
          ts: r.ts,
          channel_id: r.entity_type === 'channel' ? r.entity_id : null,
          raw: r,
        }))
        setAlerts(prev => {
          const ids = new Set(prev.map(a => a.id))
          const merged = [...prev]
          for (const m of mapped) if (!ids.has(m.id)) merged.unshift(m)
          return merged.slice(0, 200)
        })
      } catch {}
    }
    es.onerror = () => { /* keep alive, silent */ }
    return () => { try { es.close() } catch {} }
  }, [])

  // Persist settings
  useEffect(() => { try { localStorage.setItem(THRESH_KEY, JSON.stringify(thresholds)) } catch {} }, [thresholds])
  useEffect(() => { try { localStorage.setItem(OVERLAY_KEY, String(baselineOverlay)) } catch {} }, [baselineOverlay])
  useEffect(() => { try { localStorage.setItem(ACK_KEY, JSON.stringify(Array.from(acked))) } catch {} }, [acked])

  const getThresholds = (channelId) => {
    if (channelId && thresholds.perChannel?.[channelId]) return thresholds.perChannel[channelId]
    return thresholds.global
  }

  const setThresholds = (channelId, partial) => {
    setThresholdsState(prev => {
      if (!channelId) return { ...prev, global: { ...prev.global, ...partial } }
      const per = { ...(prev.perChannel || {}) }
      per[channelId] = { ...(per[channelId] || prev.global), ...partial }
      return { ...prev, perChannel: per }
    })
  }

  const ack = (id) => setAcked(prev => new Set(prev).add(id))
  const ackAll = () => setAcked(prev => new Set([...prev, ...alerts.map(a => a.id)]))

  const unackedCount = useMemo(() => alerts.filter(a => !acked.has(a.id)).length, [alerts, acked])

  const value = useMemo(() => ({
    alerts,
    ack,
    ackAll,
    acked,
    unackedCount,
    thresholds,
    getThresholds,
    setThresholds,
    baselineOverlay,
    setBaselineOverlay,
    API_BASE,
  }), [alerts, acked, unackedCount, thresholds, baselineOverlay])

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}

export function useAlerts() {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider')
  return ctx
}

