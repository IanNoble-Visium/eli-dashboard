import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'
import Autoplay from 'embla-carousel-autoplay'
import { useTimeRange } from '@/context/TimeRangeContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export default function PlateIdentitiesPanel() {
  const { debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const [data, setData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [selectedPlate, setSelectedPlate] = useState(null)
  const [autoRotate, setAutoRotate] = useState(false)

  const normalizeImageUrls = (urls) => {
    if (!Array.isArray(urls)) return []
    const normalized = urls
      .map(u => typeof u === 'string' ? u.trim() : '')
      .filter(Boolean)
      .map(u => (u.startsWith('http') ? u : `${API_BASE}${u}`))
    return Array.from(new Set(normalized))
  }

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
          owner_last_name: p.owner_last_name,
          images: normalizeImageUrls(p.images)
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
        out.push({ id: n.id, number: num, state: st, owner, images: n.properties?.images || [] })
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
                      <TableCell className="font-medium cursor-pointer hover:text-primary" onClick={() => setSelectedPlate(p)}>{p.number}</TableCell>
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

      {/* Image Modal */}
      <Dialog open={!!selectedPlate} onOpenChange={() => setSelectedPlate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPlate?.number} - {selectedPlate?.state}</DialogTitle>
            <DialogDescription>
              {selectedPlate?.images?.length ? `${selectedPlate.images.length} image${selectedPlate.images.length > 1 ? 's' : ''} from related events` : 'No images'}
            </DialogDescription>
          </DialogHeader>
          {selectedPlate?.images?.length > 0 ? (
            <div className="space-y-4">
              <Carousel
                className="w-full max-w-xs mx-auto"
                opts={{ loop: true }}
                plugins={autoRotate ? [Autoplay({ delay: 3000 })] : []}
              >
                <CarouselContent>
                  {selectedPlate.images.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <img
                          src={url}
                          alt={`${selectedPlate.number} - ${index + 1}`}
                          className="w-full h-64 object-cover rounded-lg"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSI3NjgiIHZpZXdCb3g9IjAgMCAxMDI0IDc2OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAyNCIgaGVpZ2h0PSI3NjgiIGZpbGw9IiNGM0ZGRjYiLz48dGV4dCB4PSI1MTIiIHk9IjM4NCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zNWVtIiBmaWxsPSIjOUI5QkE0IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='
                            e.target.alt = 'Image not available'
                          }}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRotate(!autoRotate)}
                >
                  {autoRotate ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {autoRotate ? 'Stop Auto' : 'Auto Rotate'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No images available for this plate identity.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

