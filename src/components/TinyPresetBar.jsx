import React from 'react'
import { Button } from '@/components/ui/button'
import { PRESETS } from '@/lib/timePresets'

export default function TinyPresetBar({ timeRange, setTimeRange, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {PRESETS.map(p => (
        <Button
          key={p.value}
          variant={timeRange === p.value ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setTimeRange(p.value)}
        >
          Last {p.label}
        </Button>
      ))}
    </div>
  )
}

