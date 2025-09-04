import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import {
  MapPin,
  Camera,
  Clock,
  Eye,
  Filter,
  RefreshCw,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Minus,
  Square,
  Move
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import FloatingWindow from '@/components/ui/floating-window'
import { Badge } from '@/components/ui/badge'
import TimeRangeSelector from '@/components/TimeRangeSelector'
import { useTimeRange } from '@/context/TimeRangeContext'
import { useAuth } from '@/context/AuthContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayersControl } from 'react-leaflet'
import { Input } from '@/components/ui/input'
import 'leaflet/dist/leaflet.css'

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
// Fix for default markers in react-leaflet
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

// Custom marker icons for different event types
const createCustomIcon = (color = 'red') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  })
}

const eventTypeColors = {
  'FaceNotMatched': '#ef4444',
  'FaceMatched': '#22c55e',
  'MotionDetected': '#3b82f6',
  'ObjectDetected': '#f59e0b',
  'default': '#6b7280'
}

function MapController({ center, zoom }) {
  const map = useMap()

  useEffect(() => {
    if (center) {
      map.setView(center, zoom)
    }
  }, [map, center, zoom])

  return null
}

export function GeographicMap() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { timeRange, debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const { authFetch, isAuthenticated } = useAuth()
  const [eventType, setEventType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  // const [cameras, setCameras] = useState([]) // kept for future: used in Map statistics

  const [mapCenter, setMapCenter] = useState([-12.0962697115117, -77.0260798931122]) // Lima, Peru
  const [mapZoom, setMapZoom] = useState(13)
  // Hover thumbnail cache: { `${lat},${lng}`: url }
  // Hover thumbnails disabled for now to reduce extra API traffic
  // const [hoverThumbCache, setHoverThumbCache] = useState({})
  // const hoverAbortRef = useRef(null)
  // const hoverTimeoutRef = useRef(null)

  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [eventGroup, setEventGroup] = useState([])
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [snapshotsCache, setSnapshotsCache] = useState({}) // { [eventId]: snapshots[] }
  const [carouselApi, setCarouselApi] = useState(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  const [loadingSnapshots, setLoadingSnapshots] = useState(false)
  useEffect(() => {
    if (!carouselApi) return
    const onSelect = () => setCarouselIndex(carouselApi.selectedScrollSnap?.() ?? carouselApi.selectedScrollSnap)
    onSelect()
    try { carouselApi.on?.('select', onSelect) } catch {}
    return () => { try { carouselApi.off?.('select', onSelect) } catch {} }
  }, [carouselApi])


  const [selectedEvent, setSelectedEvent] = useState(null)
  const [fullPage, setFullPage] = useState(false)
  const mapRef = useRef()
  const firstLoadRef = useRef(true)
  const inFlightRef = useRef(false)
  const lastQueryRef = useRef('')

  // Debug logging (only in development)
  if (import.meta.env.DEV) {
    console.log('GeographicMap component rendered', {
      loading,
      error,
      eventsCount: events.length,
      mapCenter,
      API_BASE
    })
  }

  const fetchGeoEvents = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      // Build query string first to dedupe identical requests
      const params = new URLSearchParams({ limit: '1000' })
      if (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end) {
        params.set('start', String(debouncedAbsoluteRange.start))
        params.set('end', String(debouncedAbsoluteRange.end))
      } else {
        params.set('timeRange', timeRange)
      }
      if (eventType && eventType !== 'all') params.append('eventType', eventType)
      const url = `${API_BASE}/events/geo?${params}`

      // Skip if same as last query and a request is already in-flight
      if (inFlightRef.current && lastQueryRef.current === url) {
        if (import.meta.env.DEV) console.log('⏭️ Skipping duplicate in-flight request')
        return
      }

      lastQueryRef.current = url
      inFlightRef.current = true

      if (import.meta.env.DEV) {
        console.log('🔄 Starting fetchGeoEvents...')
        console.log('📡 Fetching from URL:', url)
      }
      setLoading(true)
      setError(null)

      const response = await authFetch(url)
      if (import.meta.env.DEV) {
        console.log('📥 Response status:', response.status, response.statusText)
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        throw new Error(`Failed to fetch geographic events: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (import.meta.env.DEV) {
        console.log('✅ Received data:', data)
        console.log('📊 Events count:', data.events?.length || 0)
      }

      setEvents((prev) => {
        // Avoid setState thrash by checking reference sizes
        const next = data.events || []
        if (prev.length === next.length) return prev
        return next
      })

      // Auto-center only once on the very first successful load
      if (firstLoadRef.current && data.events && data.events.length > 0) {
        const firstEvent = data.events[0]
        if (import.meta.env.DEV) {
          console.log('🎯 First load: setting map center to first event:', firstEvent)
        }
        setMapCenter([firstEvent.latitude, firstEvent.longitude])
        firstLoadRef.current = false
      }

    } catch (err) {
      console.error('❌ Geographic events fetch error:', err)
      setError(err.message)
    } finally {
      if (import.meta.env.DEV) {
        console.log('🏁 fetchGeoEvents completed, setting loading to false')
      }
      setLoading(false)
      inFlightRef.current = false
    }
  }, [debouncedAbsoluteRange, timeRange, eventType, isAuthenticated, authFetch])

  // const fetchCameras = async () => {
  //   try {
  //     const res = await fetch(`${API_BASE}/events/cameras`)
  //     if (res.ok) {
  //       const data = await res.json()
  //       setCameras(data.cameras || [])
  //     }
  //   } catch (err) {
  //     console.error('Camera fetch error:', err)
  //   }
  // }

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 useEffect triggered - fetching data...')
      console.log('🌐 API_BASE:', API_BASE)
    }

    // Optional connectivity check in dev only, gated by env flag
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_TEST_FETCH === 'true') {
      fetch(`${API_BASE}/events/geo?timeRange=30m&limit=5`).then(() => {}).catch(() => {})
    }

    fetchGeoEvents()
    // fetchCameras()
  }, [fetchGeoEvents])

  useEffect(() => {
    const handleRefresh = () => {
      fetchGeoEvents()
      // fetchCameras()
    }
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [fetchGeoEvents])

  const filteredEvents = events.filter(event => {
    if (!searchTerm) return true
    return (
      event.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.channel_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })


  // Derive camera positions from events' latitude/longitude (latest event per camera)
  const cameraPositions = useMemo(() => {
    const latestByCam = new Map()
    events.forEach(e => {
      if (typeof e.latitude === 'number' && typeof e.longitude === 'number') {
        const prev = latestByCam.get(e.channel_id)
        const toMillis = (t) => {
          if (t == null) return 0
          const ts = typeof t === 'string' && /^\d+$/.test(t) ? Number(t) : t
          const d = new Date(ts)
          return isNaN(d.getTime()) ? 0 : d.getTime()
        }
        const currTime = toMillis(e.start_time)
        const prevTime = prev ? toMillis(prev.start_time) : -Infinity
        if (!prev || currTime >= prevTime) {


          latestByCam.set(e.channel_id, {
            channel_id: e.channel_id,
            channel_name: e.channel_name,
            lat: e.latitude,
            lng: e.longitude,
            start_time: e.start_time
          })
        }
      }
    })
    return Array.from(latestByCam.values())
  }, [events])

  const fetchSnapshotsForEvent = async (eventId) => {
    if (!eventId) return []
    if (snapshotsCache[eventId]) return snapshotsCache[eventId]
    try {
      setLoadingSnapshots(true)
      const params = new URLSearchParams({ page: '1', limit: '50', eventId: String(eventId) })
      const res = await authFetch(`${API_BASE}/snapshots?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch snapshots')
      const data = await res.json()
      const snaps = (data.snapshots || []).filter(s => s.image_url)
      setSnapshotsCache(prev => ({ ...prev, [eventId]: snaps }))
      return snaps
    } catch (e) {
      console.error('Failed to fetch snapshots for event', eventId, e)
      return []
    } finally {
      setLoadingSnapshots(false)
    }
  }

  const openImageViewerForEvent = async (event) => {
    const group = events.filter(e => e.channel_id === event.channel_id)
      .sort((a, b) => {
        const toMillis = (t) => {
          if (t == null) return 0
          const ts = typeof t === 'string' && /^\d+$/.test(t) ? Number(t) : t
          const d = new Date(ts)
          return isNaN(d.getTime()) ? 0 : d.getTime()
        }
        return toMillis(b.start_time) - toMillis(a.start_time)
      })
    setEventGroup(group)
    const idx = group.findIndex(e => e.id === event.id)
    setCurrentEventIndex(Math.max(0, idx))
    await fetchSnapshotsForEvent(event.id)
    setSelectedEvent(event)
    setImageViewerOpen(true)
  }

  const goToPrevEvent = async () => {
    if (currentEventIndex <= 0) return
    const newIndex = currentEventIndex - 1
    setCurrentEventIndex(newIndex)
    const evt = eventGroup[newIndex]

    setSelectedEvent(evt)
    await fetchSnapshotsForEvent(evt.id)
  }

  const goToNextEvent = async () => {
    if (currentEventIndex >= eventGroup.length - 1) return
    const newIndex = currentEventIndex + 1
    setCurrentEventIndex(newIndex)
    const evt = eventGroup[newIndex]
    setSelectedEvent(evt)
    await fetchSnapshotsForEvent(evt.id)
  }

  const handleEventClick = async (event) => {
    setSelectedEvent(event)
    setMapCenter([event.latitude, event.longitude])
    setMapZoom(16)
    await openImageViewerForEvent(event) // open image modal with carousel
  }

  const formatTimestamp = (timestamp) => {
    if (timestamp == null) return '—'
    const ts = typeof timestamp === 'string' && /^\d+$/.test(timestamp)
      ? Number(timestamp)
      : timestamp
    const d = new Date(ts)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Geographic Map View</h1>
          <p className="text-muted-foreground">
            Interactive map showing event locations from IREX cameras
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>{filteredEvents.length} events</span>
          </Badge>

          <Button onClick={fetchGeoEvents} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button onClick={() => setFullPage(!fullPage)} variant="outline" size="sm">
            {fullPage ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
            {fullPage ? 'Exit Full Page' : 'Full Page'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {!fullPage && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <TimeRangeSelector />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Event Type</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="FaceNotMatched">Face Not Matched</SelectItem>
                  <SelectItem value="FaceMatched">Face Matched</SelectItem>
                  <SelectItem value="MotionDetected">Motion Detected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Map and Event Details */}
      <div className={`grid grid-cols-1 ${fullPage ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
        {/* Map */}
        <div className={fullPage ? "lg:col-span-1" : "lg:col-span-2"}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layers className="w-5 h-5" />
                <span>Event Locations</span>
              </CardTitle>
              <CardDescription>
                Click on markers to view event details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Debug Info */}
              <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                <strong>🐛 Debug Info:</strong> Loading: {loading.toString()}, Error: {error || 'none'}, Events: {events.length}, API: {API_BASE}
              </div>

              {(() => {
                if (!import.meta.env.DEV) {
                  // no-op in production
                } else {
                  // Minimal dev debug can be enabled if needed
                  // console.log('Render decision', { loading, error, eventsCount: events.length })
                }

                if (loading) {
                  return (
                    <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span>Loading map data...</span>
                      </div>
                    </div>
                  )
                }

                if (error) {
                  console.log('❌ Rendering error state:', error)
                  return (
                    <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-destructive mb-2">Error loading map data: {error}</p>
                        <Button onClick={fetchGeoEvents} variant="outline">
                          Retry
                        </Button>
                      </div>
                    </div>
                  )
                }

                // Dev-only: map render count
                // console.log('Map with events', events.length)
                return null
              })()}

              {!loading && !error && (
                <div className="h-96 rounded-lg overflow-hidden">
                  {(() => {
                    console.log('🗺️ Rendering MapContainer with:', { mapCenter, mapZoom, eventsCount: events.length })
                    return (
                      <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%' }}
                        ref={mapRef}
                        whenCreated={(map) => {
                          console.log('🎯 Map created successfully!', map)
                        }}
                      >
                        <MapController center={mapCenter} zoom={mapZoom} />
                    <LayersControl position="topright">
                      <LayersControl.BaseLayer name="OpenStreetMap" checked>
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                      </LayersControl.BaseLayer>
                      <LayersControl.BaseLayer name="Dark Matter">
                        <TileLayer
                          attribution='&copy; CartoDB'
                          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                        />
                      </LayersControl.BaseLayer>
                      <LayersControl.BaseLayer name="Topographic">
                        <TileLayer
                          attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
                          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                        />
                      </LayersControl.BaseLayer>
                    </LayersControl>

                    {/* Camera markers derived from event geos */}
                    {cameraPositions.map((cam) => (
                      <Marker
                        key={`cam-${cam.channel_id}`}
                        position={[cam.lat, cam.lng]}
                        icon={createCustomIcon('#3b82f6')}
                      >
                        <Popup>
                          <div className="p-2">
                            <div className="font-semibold mb-1">{cam.channel_name || `Camera ${cam.channel_id}`}</div>
                            <div className="text-xs">ID: {cam.channel_id}</div>



                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {filteredEvents.map((event) => (
                      <Marker
                        key={event.id}
                        position={[event.latitude, event.longitude]}
                        icon={createCustomIcon(eventTypeColors[event.topic] || eventTypeColors.default)}
                        eventHandlers={{
                          click: () => handleEventClick(event),
                          // Hover thumbnails disabled for now to reduce extra API calls
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} sticky={false} permanent={false}>
                          <div className="bg-background border rounded shadow p-1">
                            {(() => {
                              return (
                                <div className="w-[150px] h-[100px] grid place-items-center text-xs text-muted-foreground">Event</div>
                              )
                            })()}
                          </div>
                        </Tooltip>
                        <Popup>
                          <div className="p-2 min-w-64">
                            <h3 className="font-semibold mb-2">{event.topic}</h3>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center space-x-2">
                                <Camera className="w-3 h-3" />
                                <span>{event.channel_name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-3 h-3" />
                                <span>{formatTimestamp(event.start_time)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Eye className="w-3 h-3" />
                                <span>{event.snapshot_count} snapshots</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-3 h-3" />
                                <span>{event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}</span>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                      </MapContainer>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event Details Panel */}
        {!fullPage && (
          <div>
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                {selectedEvent ? 'Selected event information' : 'Click on a map marker to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedEvent.topic}</h3>
                    <Badge variant="outline">{selectedEvent.level}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEvent.channel_name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{formatTimestamp(selectedEvent.start_time)}</span>
                    </div>

                    <div className="flex items-center space-x-2">

              {/* Legend */}
              <div className="mt-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: eventTypeColors.FaceNotMatched}} />
                  <span>Face Not Matched</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: eventTypeColors.MotionDetected}} />
      {/* Floating Image Viewer (draggable, resizable) */}
      {imageViewerOpen && (
        <FloatingWindow
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          title={selectedEvent ? `${selectedEvent.topic} • ${selectedEvent.channel_name}` : 'Event'}
          initialRect={{ x: 240, y: 80, w: 820, h: 560 }}
        >
          <div className="flex flex-col h-full overflow-hidden">
          {/* Event navigation when multiple events at location */}
          {eventGroup.length > 1 && (
            <div className="flex items-center justify-between mb-3 text-sm shrink-0">
              <Button size="sm" variant="outline" onClick={goToPrevEvent} disabled={currentEventIndex === 0}>
                Previous event
              </Button>
              <div className="text-muted-foreground">
                Event {currentEventIndex + 1} of {eventGroup.length}
              </div>
              <Button size="sm" variant="outline" onClick={goToNextEvent} disabled={currentEventIndex >= eventGroup.length - 1}>
                Next event
              </Button>
            </div>
          )}

          {/* Carousel + thumbnail strip */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="relative flex-1 min-h-0">
            {loadingSnapshots && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10 rounded-md">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              </div>
            )}

            {selectedEvent && (() => {
              const snaps = snapshotsCache[selectedEvent.id] || []
              if (snaps.length === 0) {
                return (
                  <div className="flex items-center justify-center bg-black/80 rounded-md text-white/80" style={{ height: 'calc(100% - 110px)' }}>
                    No snapshots available for this event.
                  </div>
                )
              }
              return (
                <>
                  <Carousel className="w-full" setApi={setCarouselApi}>
                    <CarouselContent>
                      {snaps.map((snap, idx) => (
                        <CarouselItem key={snap.id}>
                          <div className="flex items-center justify-center bg-black/80 rounded-md overflow-hidden" style={{ height: 'calc(100% - 110px)' }}>
                            <img
                              src={snap.image_url}
                              alt={`${selectedEvent.topic} snapshot`}
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="-left-4" />
                    <CarouselNext className="-right-4" />
                  </Carousel>

                  {/* Index display */}
                  <div className="text-xs text-muted-foreground mt-1">
                    {snaps.length > 0 && `${carouselIndex + 1} of ${snaps.length}`}
                  </div>

                  {/* Thumbnail strip */}
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {snaps.map((snap, i) => (
                      <button key={snap.id} className={`border rounded-xs overflow-hidden shrink-0 ${i===carouselIndex? 'ring-1 ring-primary' : ''}`} style={{ width: 96, height: 64 }}
                        onClick={() => { carouselApi?.scrollTo(i); setCarouselIndex(i); }}
                        title={`Image ${i + 1}`}
                      >
                        <img src={snap.image_url} alt="thumb" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </>
              )
            })()}

            </div>


            {/* Metadata */}
            {selectedEvent && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Camera</div>
                  <div className="font-medium">{selectedEvent.channel_name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div className="font-medium">{selectedEvent.topic}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Snapshots</div>
                  <div className="font-medium">{(snapshotsCache[selectedEvent.id] || []).length} / {selectedEvent.snapshot_count}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        </FloatingWindow>
      )}
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#3b82f6'}} />
                  <span>Camera</span>
                </div>
              </div>

                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEvent.snapshot_count} snapshots available</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {selectedEvent.latitude.toFixed(6)}, {selectedEvent.longitude.toFixed(6)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button className="w-full" variant="outline">
                      View Full Details
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an event on the map to view details</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map Statistics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Map Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Events</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Filtered Events</span>
                  <span className="font-medium">{filteredEvents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Time Range</span>
                  <span className="font-medium">{timeRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Cameras</span>
                  <span className="font-medium">
                    {new Set(events.map(e => e.channel_id)).size}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </div>
  )
}

export default memo(GeographicMap)

