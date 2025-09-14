import { useEffect, useMemo, useState } from 'react'
import { useAlerts } from '@/context/AlertsContext'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export default function SettingsDialog({ open, onOpenChange }) {
  const { getThresholds, setThresholds, baselineOverlay, setBaselineOverlay, API_BASE } = useAlerts()
  const { token } = useAuth()
  const [channelId, setChannelId] = useState('') // empty = Global
  const [form, setForm] = useState({ ratePct: 0.4, confBelowPct: 0.2, anomPerHour: 5 })
  const [cameras, setCameras] = useState([])

  useEffect(() => {
    const t = getThresholds(channelId || null)
    setForm({ ratePct: t.ratePct ?? 0.4, confBelowPct: t.confBelowPct ?? 0.2, anomPerHour: t.anomPerHour ?? 5 })
  }, [channelId, open])

  useEffect(() => {
    if (!open) return
    fetch(`${API_BASE}/api/events/cameras?timeRange=7d`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json()).then(d => setCameras(d?.cameras || [])).catch(()=>{})
  }, [open])

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    setThresholds(channelId || null, { ratePct: Number(form.ratePct), confBelowPct: Number(form.confBelowPct), anomPerHour: parseInt(form.anomPerHour || 5, 10) })
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alert Thresholds & Display</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Scope</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Global" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Global (default)</SelectItem>
                {cameras.map(c => <SelectItem key={c.channel_id} value={c.channel_id}>{c.channel_name || c.channel_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Rate change threshold (%)</Label>
              <Input type="number" min={0} max={100} step="1" value={Math.round(form.ratePct*100)} onChange={e => handleChange('ratePct', (Number(e.target.value)||0)/100)} />
            </div>
            <div>
              <Label>Confidence below baseline (%)</Label>
              <Input type="number" min={0} max={100} step="1" value={Math.round(form.confBelowPct*100)} onChange={e => handleChange('confBelowPct', (Number(e.target.value)||0)/100)} />
            </div>
            <div>
              <Label>High anomalies per hour</Label>
              <Input type="number" min={1} step="1" value={form.anomPerHour} onChange={e => handleChange('anomPerHour', Number(e.target.value)||5)} />
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <div className="font-medium text-sm">Show baseline overlays on charts</div>
              <div className="text-xs text-muted-foreground">Toggle visibility of dashed baseline lines</div>
            </div>
            <Switch checked={baselineOverlay} onCheckedChange={setBaselineOverlay} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

