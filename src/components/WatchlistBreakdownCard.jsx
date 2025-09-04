import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { useTimeRange } from '@/context/TimeRangeContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export default function WatchlistBreakdownCard() {
  const { debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const [data, setData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [levelFilter, setLevelFilter] = useState('all')

  const fetchGraph = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit: '500' })
      if (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end) {
        params.set('start', String(debouncedAbsoluteRange.start))
        params.set('end', String(debouncedAbsoluteRange.end))
      } else {
        params.set('timeRange', debouncedTimeRange)
      }
      const res = await fetch(`${API_BASE}/dashboard/graph?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch watchlist data')
      const json = await res.json()
      setData({ nodes: json.nodes || [], edges: json.edges || [] })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGraph() }, [debouncedTimeRange, debouncedAbsoluteRange])

  const summary = useMemo(() => {
    const watchlists = new Map() // id -> { name, level, events, face_hits, plate_hits }
    const facesToWl = new Map() // faceId -> Set(wlId)
    const platesToWl = new Map() // plateId -> Set(wlId)

    for (const n of data.nodes) {
      if (n.type === 'Watchlist') {
        const id = n.id
        watchlists.set(id, {
          id,
          name: n.properties?.name || id,
          level: n.properties?.level || 'unknown',
          events: 0,
          face_hits: 0,
          plate_hits: 0,
        })
      }
    }

    // Build identity -> watchlist mapping
    for (const e of data.edges) {
      if (e.type === 'IN_LIST') {
        // Could be Event->WL, Face->WL or Plate->WL. We detect by looking at nodes
        // Build node lookup lazily
      }
    }
    const nodeById = new Map(data.nodes.map(n => [n.id, n]))
    for (const edge of data.edges) {
      if (edge.type === 'IN_LIST') {
        const src = nodeById.get(edge.source)
        const tgt = nodeById.get(edge.target)
        if (!src || !tgt) continue
        if (tgt.type !== 'Watchlist') continue
        const wlId = tgt.id
        if (src.type === 'FaceIdentity') {
          if (!facesToWl.has(src.id)) facesToWl.set(src.id, new Set())
          facesToWl.get(src.id).add(wlId)
        } else if (src.type === 'PlateIdentity') {
          if (!platesToWl.has(src.id)) platesToWl.set(src.id, new Set())
          platesToWl.get(src.id).add(wlId)
        } else if (src.type === 'Event') {
          // Event directly in list: count an event hit
          const wl = watchlists.get(wlId)
          if (wl) wl.events += 1
        }
      }
    }

    // Count face/plate hits per watchlist via matched edges
    for (const edge of data.edges) {
      if (edge.type === 'MATCHED_FACE') {
        const faceWls = facesToWl.get(edge.target)
        if (faceWls) {
          for (const wlId of faceWls) {
            const wl = watchlists.get(wlId)
            if (wl) wl.face_hits += 1
          }
        }
      } else if (edge.type === 'MATCHED_PLATE') {
        const plateWls = platesToWl.get(edge.target)
        if (plateWls) {
          for (const wlId of plateWls) {
            const wl = watchlists.get(wlId)
            if (wl) wl.plate_hits += 1
          }
        }
      }
    }

    let rows = Array.from(watchlists.values())
    if (levelFilter !== 'all') rows = rows.filter(r => String(r.level).toLowerCase() === levelFilter)
    // Sort by total hits desc
    rows.sort((a, b) => (b.events + b.face_hits + b.plate_hits) - (a.events + a.face_hits + a.plate_hits))
    return rows
  }, [data, levelFilter])

  const levels = useMemo(() => {
    const set = new Set(summary.map(r => String(r.level).toLowerCase()))
    return Array.from(set)
  }, [summary])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Watchlist Breakdown</CardTitle>
            <CardDescription>Events and matches by watchlist</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {levels.map(l => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
              </SelectContent>
            </Select>
            <Badge variant={loading ? 'secondary' : 'outline'} className="flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{data.nodes.length} nodes</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Face Hits</TableHead>
                  <TableHead className="text-right">Plate Hits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell><Badge variant="outline">{row.level}</Badge></TableCell>
                    <TableCell className="text-right">{row.events}</TableCell>
                    <TableCell className="text-right">{row.face_hits}</TableCell>
                    <TableCell className="text-right">{row.plate_hits}</TableCell>
                  </TableRow>
                ))}
                {summary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No watchlist data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

