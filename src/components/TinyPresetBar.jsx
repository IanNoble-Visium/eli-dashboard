import React from 'react'
import { Button } from '@/components/ui/button'
import { PRESETS } from '@/lib/timePresets'
import { useTimeRange } from '@/context/TimeRangeContext'

// Works with or without explicit props; falls back to TimeRangeContext
export default function TinyPresetBar({ timeRange: trProp, setTimeRange: setProp, className = '' }) {
  const ctx = (() => { try { return useTimeRange() } catch { return null } })()
  const timeRange = trProp ?? ctx?.timeRange
  const setTimeRange = setProp ?? ctx?.setTimeRange

  const disabled = typeof setTimeRange !== 'function'

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {PRESETS.map(p => (
        <Button
          key={p.value}
          variant={timeRange === p.value ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={disabled}
          onClick={() => setTimeRange && setTimeRange(p.value)}
        >
          Last {p.label}
        </Button>
      ))}
    </div>
  )
}

