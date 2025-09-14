import { useMemo } from 'react'
import { useAlerts } from '@/context/AlertsContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

function SevChip({ level='low' }) {
  const styles = level==='high'
    ? 'bg-red-100 text-red-800 border border-red-200'
    : level==='medium'
      ? 'bg-amber-100 text-amber-900 border border-amber-200'
      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
  const label = level==='high' ? 'HIGH' : level==='medium' ? 'MED' : 'LOW'
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles}`}>{label}</span>
}

export default function AlertCenterList({ max=15, onAckAll }) {
  const { alerts, ack, ackAll, acked, unackedCount } = useAlerts()
  const items = useMemo(() => alerts.slice(0, max), [alerts, max])
  return (
    <div className="min-w-96 p-2">
      <div className="flex items-center justify-between py-1">
        <div className="text-sm font-medium tracking-tight">Alerts</div>
        <Badge variant="secondary" className="text-xs">Unacked: {unackedCount}</Badge>
      </div>
      <Separator className="my-2" />
      <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
        {items.length === 0 && <div className="text-xs text-muted-foreground py-8 text-center">No alerts</div>}
        {items.map(a => (
          <div key={a.id} className="border rounded-md px-3 py-2 text-sm grid grid-cols-[1fr_auto] gap-3 items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SevChip level={a.severity} />
                <span className="font-medium leading-tight">{a.title}</span>
              </div>
              <div className="text-xs text-muted-foreground leading-snug">{a.message}</div>
              {a.channel_id && <div className="text-[10px] text-muted-foreground">Channel: {a.channel_id}</div>}
            </div>
            <div className="flex items-start">
              {!acked.has(a.id) ? (
                <Button size="sm" variant="outline" className="h-7" onClick={() => ack(a.id)}>Ack</Button>
              ) : (
                <span className="text-[10px] text-muted-foreground mt-1">Acked</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <Separator className="my-2" />
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onAckAll || ackAll}>Ack all</Button>
      </div>
    </div>
  )
}

