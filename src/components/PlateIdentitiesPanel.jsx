import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTimeRange } from '@/context/TimeRangeContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export default function PlateIdentitiesPanel() {
  const { debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const [data, setData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('all')

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
      if (!res.ok) throw new Error('Failed to fetch plate identities')
      const json = await res.json()
      const nodes = (json.plates || []).map(p => ({
        id: p.id,
        type: 'PlateIdentity',
        properties: {
          number: p.number,
          state: p.state,
          owner_first_name: p.owner_first_name,
          owner_last_name: p.owner_last_name
        }
      }))
      setData({ nodes, edges: [] })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGraph() }, [debouncedTimeRange, debouncedAbsoluteRange])

  const plates = useMemo(() => {
    const out = []
    const states = new Set()
    for (const n of data.nodes) {
      if (n.type === 'PlateIdentity') {
        const num = n.properties?.number || ''
        const st = n.properties?.state || ''
        states.add(st)
        const ownerFirst = n.properties?.owner_first_name || ''
        const ownerLast = n.properties?.owner_last_name || ''
        const owner = `${ownerFirst} ${ownerLast}`.trim()
        const text = `${num} ${st} ${owner}`.toLowerCase()
        if (query && !text.includes(query.toLowerCase())) continue
        if (stateFilter !== 'all' && st.toLowerCase() !== stateFilter) continue
        out.push({ id: n.id, number: num, state: st, owner })
      }
    }
    out.sort((a, b) => a.number.localeCompare(b.number))
    return { rows: out, stateOptions: Array.from(states).filter(Boolean).sort() }
  }, [data, query, stateFilter])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plate Identities</CardTitle>
        <CardDescription>License numbers, states, and owners</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <Input placeholder="Search plates / owners" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {plates.stateOptions.map(st => (
                    <SelectItem key={st} value={st.toLowerCase()}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plates.rows.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.number}</TableCell>
                      <TableCell>{p.state}</TableCell>
                      <TableCell>{p.owner || <span className="text-muted-foreground">Unknown</span>}</TableCell>
                    </TableRow>
                  ))}
                  {plates.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No plate identities</TableCell>
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

