import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { useTimeRange } from '@/context/TimeRangeContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export default function FaceIdentitiesPanel() {
  const { debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const [data, setData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [nameFilter, setNameFilter] = useState('')
  const [minSim, setMinSim] = useState(0.0)

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
      const res = await fetch(`${API_BASE}/dashboard/identities?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch face identities')
      const json = await res.json()
      // Map to unified display rows from identities endpoint
      const nodes = (json.faces || []).map(f => ({
        id: f.id,
        type: 'FaceIdentity',
        properties: { first_name: f.first_name, last_name: f.last_name, similarity: f.similarity }
      }))
      setData({ nodes, edges: [] })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGraph() }, [debouncedTimeRange, debouncedAbsoluteRange])

  const faces = useMemo(() => {
    const out = []
    for (const n of data.nodes) {
      if (n.type === 'FaceIdentity') {
        const sim = Number(n.properties?.similarity ?? 0)
        const first = n.properties?.first_name || ''
        const last = n.properties?.last_name || ''
        const name = `${first} ${last}`.trim()
        if (nameFilter && !name.toLowerCase().includes(nameFilter.toLowerCase())) continue
        if (sim < minSim) continue
        out.push({
          id: n.id,
          name: name || `Face ${n.id}`,
          similarity: sim,
        })
      }
    }
    // Sort by similarity desc
    out.sort((a, b) => b.similarity - a.similarity)
    return out
  }, [data, nameFilter, minSim])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Face Identities</CardTitle>
        <CardDescription>Similarity and names for matched faces</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <Input placeholder="Filter by name" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="max-w-xs" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Min similarity:</span>
                <div className="w-48">
                  <Slider value={[minSim]} min={0} max={1} step={0.01} onValueChange={(v) => setMinSim(v[0])} />
                </div>
                <Badge variant="outline">{minSim.toFixed(2)}</Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Similarity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faces.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-right">{f.similarity.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {faces.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">No face identities</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

