import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const API_BASE = 'http://localhost:5000/api'

export function SimpleMap() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGeoEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE}/dashboard/events/geo?timeRange=24h&limit=100`)
      if (!response.ok) throw new Error('Failed to fetch geographic events')
      
      const data = await response.json()
      setEvents(data.events || [])

    } catch (err) {
      setError(err.message)
      console.error('Geographic events fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGeoEvents()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Simple Map Test</h1>
        <div className="h-96 bg-muted rounded-lg animate-pulse flex items-center justify-center">
          <p>Loading map...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Simple Map Test</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Simple Map Test</h1>
      <p>Found {events.length} events with coordinates</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Event Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={[-12.0962697115117, -77.0260798931122]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {events.map((event) => (
                <Marker
                  key={event.id}
                  position={[event.latitude, event.longitude]}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{event.topic}</h3>
                      <p className="text-sm">{event.channel_name}</p>
                      <p className="text-sm">{(() => { const t=event.start_time; if(t==null) return '—'; const ts=typeof t==='string' && /^\d+$/.test(t)? Number(t): t; const d=new Date(ts); return isNaN(d.getTime()) ? '—' : d.toLocaleString(); })()}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

