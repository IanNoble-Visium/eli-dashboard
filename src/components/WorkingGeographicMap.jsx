import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MapPin, 
  Camera, 
  Activity, 
  Eye, 
  RefreshCw,
  Zap,
  Clock,
  AlertTriangle
} from 'lucide-react'

// Sample geographic data from the ELI Demo system
const sampleGeoEvents = [
  {
    id: 'evt_001',
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    location: 'Lima, Peru',
    camera: 'Camera 1088',
    event_type: 'FaceNotMatched',
    level: 'INFO',
    timestamp: '2025-08-31T21:00:00Z',
    description: 'Face detection event from Lima camera system',
    snapshot_count: 2
  },
  {
    id: 'evt_002',
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    location: 'Lima, Peru',
    camera: 'Camera 1088',
    event_type: 'FaceNotMatched',
    level: 'INFO',
    timestamp: '2025-08-31T21:01:00Z',
    description: 'Face recognition processing completed',
    snapshot_count: 1
  },
  {
    id: 'evt_003',
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    location: 'Lima, Peru',
    camera: 'Camera 1088',
    event_type: 'FaceNotMatched',
    level: 'WARNING',
    timestamp: '2025-08-31T21:03:00Z',
    description: 'Face detection with low confidence score',
    snapshot_count: 1
  }
]

const cameras = [
  {
    id: 'cam_1088',
    name: 'Camera 1088',
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    location: 'Lima, Peru',
    status: 'active',
    events_count: 23,
    last_event: '2025-08-31T21:03:00Z'
  }
]

export function WorkingGeographicMap() {
  const [events, setEvents] = useState(sampleGeoEvents)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: -12.0962697115117, lng: -77.0260798931122 })
  const [zoomLevel, setZoomLevel] = useState(13)

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const getLevelBadgeVariant = (level) => {
    switch (level) {
      case 'ERROR': return 'destructive'
      case 'WARNING': return 'secondary'
      case 'INFO': return 'default'
      default: return 'outline'
    }
  }

  const getEventIcon = (level) => {
    switch (level) {
      case 'ERROR': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'WARNING': return <Eye className="w-4 h-4 text-yellow-500" />
      case 'INFO': return <Activity className="w-4 h-4 text-blue-500" />
      default: return <MapPin className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Geographic Map</h1>
          <p className="text-muted-foreground">
            Interactive map showing event locations and camera positions
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>{events.length} events</span>
          </Badge>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            <Camera className="w-3 h-3" />
            <span>{cameras.length} cameras</span>
          </Badge>
          
          <Badge variant="secondary">Live Demo Data</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Interactive Map</span>
              </CardTitle>
              <CardDescription>
                Event locations and camera positions in Lima, Peru
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Map Container */}
              <div className="relative h-96 bg-blue-100 rounded-lg border overflow-hidden">
                {/* Ocean/Water Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-blue-300"></div>
                
                {/* Land Mass - Peru Coastline Simulation */}
                <div className="absolute inset-0">
                  {/* Main Land Area */}
                  <div 
                    className="absolute bg-gradient-to-br from-green-200 via-yellow-100 to-orange-100 rounded-lg"
                    style={{
                      left: '20%',
                      top: '15%',
                      width: '65%',
                      height: '70%',
                      clipPath: 'polygon(0% 20%, 15% 0%, 85% 0%, 100% 25%, 95% 60%, 80% 85%, 20% 100%, 0% 75%)'
                    }}
                  ></div>
                  
                  {/* Coastal Areas */}
                  <div 
                    className="absolute bg-gradient-to-r from-yellow-200 to-green-200"
                    style={{
                      left: '20%',
                      top: '40%',
                      width: '25%',
                      height: '30%',
                      clipPath: 'polygon(0% 0%, 80% 10%, 90% 90%, 10% 100%)'
                    }}
                  ></div>
                  
                  {/* Mountain Ranges (Andes) */}
                  <div 
                    className="absolute bg-gradient-to-t from-orange-200 to-gray-300"
                    style={{
                      left: '50%',
                      top: '20%',
                      width: '30%',
                      height: '60%',
                      clipPath: 'polygon(20% 100%, 0% 60%, 10% 40%, 30% 20%, 50% 0%, 70% 20%, 90% 40%, 100% 60%, 80% 100%)'
                    }}
                  ></div>
                  
                  {/* Urban Areas */}
                  <div 
                    className="absolute bg-gray-200 rounded"
                    style={{
                      left: '35%',
                      top: '45%',
                      width: '8%',
                      height: '6%'
                    }}
                  ></div>
                  
                  {/* Rivers */}
                  <div 
                    className="absolute bg-blue-400 rounded-full"
                    style={{
                      left: '45%',
                      top: '30%',
                      width: '2px',
                      height: '40%',
                      transform: 'rotate(15deg)'
                    }}
                  ></div>
                  
                  {/* Roads/Infrastructure */}
                  <div 
                    className="absolute bg-gray-400 rounded-full"
                    style={{
                      left: '30%',
                      top: '48%',
                      width: '20%',
                      height: '1px'
                    }}
                  ></div>
                  <div 
                    className="absolute bg-gray-400 rounded-full"
                    style={{
                      left: '38%',
                      top: '40%',
                      width: '1px',
                      height: '15%'
                    }}
                  ></div>
                </div>

                {/* Grid Lines for Reference */}
                <div className="absolute inset-0 opacity-10">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={`h-${i}`} className="absolute w-full h-px bg-gray-600" style={{ top: `${i * 12.5}%` }}></div>
                  ))}
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={`v-${i}`} className="absolute h-full w-px bg-gray-600" style={{ left: `${i * 12.5}%` }}></div>
                  ))}
                </div>

                {/* Map Title */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                  <h3 className="font-semibold text-lg">Lima, Peru</h3>
                  <p className="text-sm text-muted-foreground">-12.0963°, -77.0261°</p>
                  <p className="text-xs text-muted-foreground mt-1">Pacific Coast Region</p>
                </div>

                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setZoomLevel(prev => Math.min(18, prev + 1))}
                    className="bg-white/95 backdrop-blur-sm"
                  >
                    +
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setZoomLevel(prev => Math.max(8, prev - 1))}
                    className="bg-white/95 backdrop-blur-sm"
                  >
                    -
                  </Button>
                </div>

                {/* Camera Marker */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20"
                  style={{ left: '40%', top: '48%' }}
                  onClick={() => setSelectedEvent(null)}
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse border-2 border-white">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium whitespace-nowrap shadow-lg border">
                      Camera 1088
                    </div>
                  </div>
                </div>

                {/* Event Markers */}
                {events.map((event, index) => (
                  <div 
                    key={event.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                    style={{ 
                      left: `${38 + index * 3}%`, 
                      top: `${46 + index * 4}%` 
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className={`relative ${selectedEvent?.id === event.id ? 'scale-125' : ''} transition-transform`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                        event.level === 'ERROR' ? 'bg-red-500' :
                        event.level === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}>
                        {getEventIcon(event.level)}
                      </div>
                      {selectedEvent?.id === event.id && (
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg p-2 text-xs font-medium whitespace-nowrap shadow-lg border z-30">
                          <div className="font-semibold">{event.event_type}</div>
                          <div className="text-muted-foreground">{formatTimestamp(event.timestamp)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                  <h4 className="font-semibold text-sm mb-2">Legend</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                      <span>Active Camera</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
                      <span>Info Event</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full border border-white"></div>
                      <span>Warning Event</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                      <span>Error Event</span>
                    </div>
                  </div>
                </div>

                {/* Compass */}
                <div className="absolute top-20 right-4 bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg border">
                  <div className="w-8 h-8 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">N</div>
                    <div className="absolute top-0 left-1/2 w-0.5 h-3 bg-red-500 transform -translate-x-1/2"></div>
                  </div>
                </div>

                {/* Scale */}
                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-2 text-xs border shadow-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-12 h-px bg-black"></div>
                    <span>1 km</span>
                  </div>
                  <div className="text-center">Zoom: {zoomLevel}</div>
                </div>
              </div>

              {/* Map Controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Full Screen
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Click markers for details • Zoom: {zoomLevel}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Details Panel */}
        <div className="space-y-6">
          {/* Selected Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Event Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedEvent.event_type}</h3>
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Event ID:</span>
                      <span className="text-sm font-mono">{selectedEvent.id}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Level:</span>
                      <Badge variant={getLevelBadgeVariant(selectedEvent.level)}>
                        {selectedEvent.level}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Camera:</span>
                      <span className="text-sm">{selectedEvent.camera}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Location:</span>
                      <span className="text-sm">{selectedEvent.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Coordinates:</span>
                      <span className="text-xs font-mono">
                        {selectedEvent.latitude.toFixed(4)}, {selectedEvent.longitude.toFixed(4)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Timestamp:</span>
                      <span className="text-xs">{formatTimestamp(selectedEvent.timestamp)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Snapshots:</span>
                      <Badge variant="outline">{selectedEvent.snapshot_count}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Zap className="w-3 h-3 mr-1" />
                      Action
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Click on an event marker to view details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Camera Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Camera Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cameras.map((camera) => (
                  <div key={camera.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{camera.name}</h4>
                      <Badge variant="default" className="bg-green-500">
                        {camera.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span>{camera.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Events:</span>
                        <span>{camera.events_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Event:</span>
                        <span className="text-xs">{formatTimestamp(camera.last_event)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Geographic Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Events:</span>
                  <Badge variant="outline">{events.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Cameras:</span>
                  <Badge variant="outline">{cameras.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Coverage Area:</span>
                  <span className="text-sm">Lima, Peru</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Update:</span>
                  <span className="text-xs">{formatTimestamp(new Date().toISOString())}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

