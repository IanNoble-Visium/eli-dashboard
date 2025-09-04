import { useState, useEffect, memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import TimeRangeSelector from '@/components/TimeRangeSelector'
import { useTimeRange } from '@/context/TimeRangeContext'
import { useAuth } from '@/context/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Database,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  Calendar,
  MapPin,
  Camera,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

// Sample data representing the ELI Demo system records
const sampleEvents = [
  {
    id: 'evt_001',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'INFO',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141600000, // 2025-08-31 21:00:00
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 2,
    status: 'processed'
  },
  {
    id: 'evt_002',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'INFO',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141660000, // 2025-08-31 21:01:00
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 1,
    status: 'processed'
  },
  {
    id: 'evt_003',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'INFO',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141720000, // 2025-08-31 21:02:00
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 3,
    status: 'processed'
  },
  {
    id: 'evt_004',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'WARNING',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141780000, // 2025-08-31 21:03:00
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 1,
    status: 'pending'
  },
  {
    id: 'evt_005',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'INFO',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141840000, // 2025-08-31 21:04:00
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 2,
    status: 'processed'
  }
]

const sampleSnapshots = [
  {
    id: 'snap_001',
    event_id: 'evt_001',
    path: '/snapshots/camera1088/2025-08-31/21-00-00_001.jpg',
    type: 'face_detection',
    size: 1024576,
    created_at: 1725141600000,
    metadata: { width: 1920, height: 1080, format: 'jpg' }
  },
  {
    id: 'snap_002',
    event_id: 'evt_001',
    path: '/snapshots/camera1088/2025-08-31/21-00-00_002.jpg',
    type: 'face_detection',
    size: 1048576,
    created_at: 1725141601000,
    metadata: { width: 1920, height: 1080, format: 'jpg' }
  },
  {
    id: 'snap_003',
    event_id: 'evt_002',
    path: '/snapshots/camera1088/2025-08-31/21-01-00_001.jpg',
    type: 'face_detection',
    size: 987654,
    created_at: 1725141660000,
    metadata: { width: 1920, height: 1080, format: 'jpg' }
  }
]

function TableView() {
  const [activeTab, setActiveTab] = useState('events')
  const [events, setEvents] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const { timeRange, debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const { authFetch, isAuthenticated } = useAuth()

  // Fetch data from API (with fallback to sample data)
  const fetchData = async (page = 1, limit = 10) => {
    if (!isAuthenticated) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end) {
        params.set('start', String(debouncedAbsoluteRange.start))
        params.set('end', String(debouncedAbsoluteRange.end))
      } else {
        params.set('timeRange', debouncedTimeRange)
      }

      // Fetch real data from API using authenticated requests
      const [eventsResponse, snapshotsResponse] = await Promise.all([
        authFetch(`${API_BASE}/events?${params.toString()}`),
        authFetch(`${API_BASE}/snapshots?${params.toString()}`)
      ])

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        setEvents(eventsData.events || [])
      }

      if (snapshotsResponse.ok) {
        const snapshotsData = await snapshotsResponse.json()
        setSnapshots(snapshotsData.snapshots || [])
      }

    } catch (err) {
      setError(err.message)
      console.error('Data fetch error:', err)
      // Use sample data as fallback
      setEvents(sampleEvents)
      setSnapshots(sampleSnapshots)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchData()
  }, [debouncedTimeRange, debouncedAbsoluteRange, isAuthenticated])

  useEffect(() => {
    const handleRefresh = () => fetchData()
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [debouncedTimeRange, debouncedAbsoluteRange, isAuthenticated])

  // Filter and search logic
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' ||
      event.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.channel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesLevel = filterLevel === 'all' || event.level === filterLevel
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus

    return matchesSearch && matchesLevel && matchesStatus
  })

  const filteredSnapshots = snapshots.filter(snapshot => {
    const matchesSearch = searchTerm === '' ||
      snapshot.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snapshot.event_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snapshot.id.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  // Pagination logic
  const currentData = activeTab === 'events' ? filteredEvents : filteredSnapshots
  const totalPages = Math.max(1, Math.ceil(currentData.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = currentData.slice(startIndex, startIndex + itemsPerPage)

  const formatTimestamp = (timestamp) => {
    if (timestamp == null) return '—'
    // Handle epoch millis passed as string (e.g., "1756964907010") or number
    const ts = typeof timestamp === 'string' && /^\d+$/.test(timestamp)
      ? Number(timestamp)
      : timestamp
    const d = new Date(ts)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getLevelBadgeVariant = (level) => {
    switch (level) {
      case 'ERROR': return 'destructive'
      case 'WARNING': return 'secondary'
      case 'INFO': return 'default'
      default: return 'outline'
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'processed': return 'default'
      case 'pending': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Table</h1>
          <p className="text-muted-foreground">
            Comprehensive view of all captured events and snapshots with CRUD capabilities
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Database className="w-3 h-3" />
            <span>{events.length} events</span>
          </Badge>

          <Badge variant="outline" className="flex items-center space-x-1">
            <ImageIcon className="w-3 h-3" />
            <span>{snapshots.length} snapshots</span>
          </Badge>


          <TimeRangeSelector />

          <Button onClick={() => fetchData(currentPage, itemsPerPage)} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <Button
                variant={activeTab === 'events' ? 'default' : 'outline'}
                onClick={() => {
                  setActiveTab('events')
                  setCurrentPage(1)
                }}
              >
                Events ({events.length})
              </Button>
              <Button
                variant={activeTab === 'snapshots' ? 'default' : 'outline'}
                onClick={() => {
                  setActiveTab('snapshots')
                  setCurrentPage(1)
                }}
              >
                Snapshots ({snapshots.length})
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>

              {activeTab === 'events' && (
                <>
                  <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="INFO">INFO</SelectItem>
                      <SelectItem value="WARNING">WARNING</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading data...</p>
              </div>
            </div>
          ) : error && currentData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-destructive mb-2">Error: {error}</p>
                <p className="text-sm text-muted-foreground">Showing sample data for demonstration</p>
              </div>
            </div>
          ) : (
            <>
              {/* Events Table */}
              {activeTab === 'events' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Camera</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Snapshots</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-sm">{event.id}</TableCell>
                        <TableCell>{event.topic}</TableCell>
                        <TableCell>
                          <Badge variant={getLevelBadgeVariant(event.level)}>
                            {event.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex items-center space-x-2">
                          <Camera className="w-4 h-4" />
                          <span>{event.channel_name}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span className="text-xs">
                              {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span className="text-sm">{formatTimestamp(event.start_time)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.snapshot_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(event.status)}>
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedRecord(event)}>
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Event Details</DialogTitle>
                                  <DialogDescription>
                                    Detailed information for event {event.id}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">ID</label>
                                      <p className="font-mono text-sm">{event.id}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Topic</label>
                                      <p>{event.topic}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Module</label>
                                      <p>{event.module}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Level</label>
                                      <Badge variant={getLevelBadgeVariant(event.level)}>
                                        {event.level}
                                      </Badge>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Camera</label>
                                      <p>{event.channel_name} ({event.channel_id})</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Status</label>
                                      <Badge variant={getStatusBadgeVariant(event.status)}>
                                        {event.status}
                                      </Badge>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="text-sm font-medium">Location</label>
                                      <p>Lat: {event.latitude}, Lng: {event.longitude}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="text-sm font-medium">Timestamp</label>
                                      <p>{formatTimestamp(event.start_time)}</p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="sm">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Snapshots Table */}
              {activeTab === 'snapshots' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Event ID</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Metadata</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((snapshot) => (
                      <TableRow key={snapshot.id}>
                        <TableCell className="font-mono text-sm">{snapshot.id}</TableCell>
                        <TableCell className="font-mono text-sm">{snapshot.event_id}</TableCell>
                        <TableCell className="font-mono text-xs max-w-xs truncate">
                          {snapshot.path}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{snapshot.type}</Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(snapshot.size)}</TableCell>
                        <TableCell>{formatTimestamp(snapshot.created_at)}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {snapshot.metadata.width}x{snapshot.metadata.height} {snapshot.metadata.format}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, currentData.length)} of {currentData.length} records
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.max(1, currentPage - 1)
                      setCurrentPage(newPage)
                      fetchData(newPage, itemsPerPage)
                    }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCurrentPage(page)
                            fetchData(page, itemsPerPage)
                          }}
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.min(totalPages, currentPage + 1)
                      setCurrentPage(newPage)
                      fetchData(newPage, itemsPerPage)
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(TableView)

