import { useMemo } from 'react'
import { useAlerts } from '@/context/AlertsContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function SevDot({ level='low' }) {
  const color = level==='high' ? 'bg-red-500' : level==='medium' ? 'bg-amber-500' : 'bg-emerald-500'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

export default function AlertCenterList({ max=10, onAckAll }) {
  const { alerts, ack, ackAll, acked, unackedCount } = useAlerts()
  const items = useMemo(() => alerts.slice(0, max), [alerts, max])
  return (
    <div className="w-80">
      <div className="flex items-center justify-between py-1">
        <div className="text-sm font-medium">Alerts</div>
        <div className="text-xs text-muted-foreground">Unacked: {unackedCount}</div>
      </div>
      <Separator className="my-1" />
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 && <div className="text-xs text-muted-foreground py-6 text-center">No alerts</div>}
        {items.map(a => (
          <div key={a.id} className="border rounded-md p-2 text-sm flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2"><SevDot level={a.severity} /><span className="font-medium">{a.title}</span></div>
              <div className="text-xs text-muted-foreground">{a.message}</div>
              {a.channel_id && <div className="text-[10px] text-muted-foreground">ch: {a.channel_id}</div>}
            </div>
            {!acked.has(a.id) ? (
              <Button size="sm" variant="outline" className="h-7" onClick={() => ack(a.id)}>Ack</Button>
            ) : (
              <span className="text-[10px] text-muted-foreground">Acked</span>
            )}
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

