import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

// Backwards-compatible import path alias
export const TimeRangeContext = createContext(null)

export function TimeRangeProvider({ children, initial = '30m', debounceMs = 400 }) {
  const [timeRange, setTimeRange] = useState(() => {
    return localStorage.getItem('eli.timeRange') || initial
  })

  // Optional absolute window override derived from zoom slider: { start, end }
  const [absoluteRange, setAbsoluteRange] = useState(null)

  useEffect(() => {
    localStorage.setItem('eli.timeRange', timeRange)
  }, [timeRange])

  const debouncedTimeRange = useDebouncedValue(timeRange, debounceMs)
  const debouncedAbsoluteRange = useDebouncedValue(absoluteRange, debounceMs)

  // Keep function identities stable to avoid cascading context updates
  const clearAbsoluteRange = useCallback(() => setAbsoluteRange(null), [])

  // IMPORTANT: Do NOT include non-debounced absoluteRange in the value so that
  // dragging the slider doesn't re-render all consumers on every handle move.
  const value = useMemo(() => ({
    timeRange,
    setTimeRange,
    debouncedTimeRange,
    debouncedAbsoluteRange,
    setAbsoluteRange,
    clearAbsoluteRange
  }), [timeRange, debouncedTimeRange, debouncedAbsoluteRange, setAbsoluteRange, clearAbsoluteRange])

  return (
    <TimeRangeContext.Provider value={value}>
      {children}
    </TimeRangeContext.Provider>
  )
}

export function useTimeRange() {
  const ctx = useContext(TimeRangeContext)
  if (!ctx) throw new Error('useTimeRange must be used within <TimeRangeProvider>')
  return ctx
}

