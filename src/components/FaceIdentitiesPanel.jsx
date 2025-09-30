import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'
import Autoplay from 'embla-carousel-autoplay'
import { useTimeRange } from '@/context/TimeRangeContext'
import { normalizeApiUrl, normalizeImageUrls } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export default function FaceIdentitiesPanel() {
  const { debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const [data, setData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [nameFilter, setNameFilter] = useState('')
  const [minSim, setMinSim] = useState(0.0)
  const [selectedFace, setSelectedFace] = useState(null)
  const [autoRotate, setAutoRotate] = useState(false)

  const normalizeImages = (urls) => normalizeImageUrls(urls, API_BASE)

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
      const res = await fetch(normalizeApiUrl(`/dashboard/identities?${params.toString()}`, API_BASE))
      if (!res.ok) throw new Error('Failed to fetch face identities')
      const json = await res.json()
      // Map to unified display rows from identities endpoint
      const nodes = (json.faces || []).map(f => ({
        id: f.id,
        type: 'FaceIdentity',
        properties: { first_name: f.first_name, last_name: f.last_name, similarity: f.similarity, images: normalizeImages(f.images) }
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
          images: n.properties?.images || [],
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
                      <TableCell className="font-medium cursor-pointer hover:text-primary" onClick={() => setSelectedFace(f)}>{f.name}</TableCell>
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

      {/* Image Modal */}
      <Dialog open={!!selectedFace} onOpenChange={() => setSelectedFace(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedFace?.name}</DialogTitle>
            <DialogDescription>
              {selectedFace?.images?.length ? `${selectedFace.images.length} image${selectedFace.images.length > 1 ? 's' : ''} from related events` : 'No images'}
            </DialogDescription>
          </DialogHeader>
          {selectedFace?.images?.length > 0 ? (
            <div className="space-y-4">
              <Carousel
                className="w-full max-w-xs mx-auto"
                opts={{ loop: true }}
                plugins={autoRotate ? [Autoplay({ delay: 3000 })] : []}
              >
                <CarouselContent>
                  {selectedFace.images.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <img
                          src={url}
                          alt={`${selectedFace.name} - ${index + 1}`}
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
              No images available for this face identity.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

