import { useState, useEffect, memo } from 'react'
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Camera, 
  Image as ImageIcon,
  Database,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'

// Sample data for search functionality
const sampleEvents = [
  {
    id: 'evt_001',
    type: 'event',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'INFO',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141600000,
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 2,
    status: 'processed',
    description: 'Face detection event from Lima camera system'
  },
  {
    id: 'evt_002',
    type: 'event',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'INFO',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141660000,
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 1,
    status: 'processed',
    description: 'Face recognition processing completed'
  },
  {
    id: 'evt_003',
    type: 'event',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'INFO',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141720000,
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 3,
    status: 'processed',
    description: 'Multiple face detections captured'
  },
  {
    id: 'evt_004',
    type: 'event',
    topic: 'FaceNotMatched',
    module: 'face_recognition',
    level: 'WARNING',
    channel_id: '1088',
    channel_name: 'Camera 1088',
    channel_type: 'camera',
    start_time: 1725141780000,
    latitude: -12.0962697115117,
    longitude: -77.0260798931122,
    snapshot_count: 1,
    status: 'pending',
    description: 'Face detection with low confidence score'
  }
]

const sampleSnapshots = [
  {
    id: 'snap_001',
    type: 'snapshot',
    event_id: 'evt_001',
    path: '/snapshots/camera1088/2025-08-31/21-00-00_001.jpg',
    snapshot_type: 'face_detection',
    size: 1024576,
    created_at: 1725141600000,
    metadata: { width: 1920, height: 1080, format: 'jpg' },
    description: 'High resolution face detection snapshot'
  },
  {
    id: 'snap_002',
    type: 'snapshot',
    event_id: 'evt_001',
    path: '/snapshots/camera1088/2025-08-31/21-00-00_002.jpg',
    snapshot_type: 'face_detection',
    size: 1048576,
    created_at: 1725141601000,
    metadata: { width: 1920, height: 1080, format: 'jpg' },
    description: 'Secondary capture for verification'
  },
  {
    id: 'snap_003',
    type: 'snapshot',
    event_id: 'evt_002',
    path: '/snapshots/camera1088/2025-08-31/21-01-00_001.jpg',
    snapshot_type: 'face_detection',
    size: 987654,
    created_at: 1725141660000,
    metadata: { width: 1920, height: 1080, format: 'jpg' },
    description: 'Clear facial features captured'
  }
]

// Combine all searchable data
const allData = [...sampleEvents, ...sampleSnapshots]

function SearchView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchType, setSearchType] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const [isSearching, setIsSearching] = useState(false)
  const [searchStats, setSearchStats] = useState({
    total: 0,
    events: 0,
    snapshots: 0,
    searchTime: 0
  })

  // Perform search
  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchStats({ total: 0, events: 0, snapshots: 0, searchTime: 0 })
      return
    }

    setIsSearching(true)
    const startTime = Date.now()

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const queryLower = query.toLowerCase()
    
    let filteredData = allData.filter(item => {
      // Search across multiple fields
      const searchFields = [
        item.id,
        item.topic || item.snapshot_type,
        item.module,
        item.level,
        item.channel_name,
        item.path,
        item.description,
        item.status
      ].filter(Boolean)

      return searchFields.some(field => 
        field.toString().toLowerCase().includes(queryLower)
      )
    })

    // Filter by type
    if (searchType !== 'all') {
      filteredData = filteredData.filter(item => item.type === searchType)
    }

    // Sort results
    if (sortBy === 'date') {
      filteredData.sort((a, b) => (b.start_time || b.created_at) - (a.start_time || a.created_at))
    } else if (sortBy === 'type') {
      filteredData.sort((a, b) => a.type.localeCompare(b.type))
    }

    const searchTime = Date.now() - startTime
    const events = filteredData.filter(item => item.type === 'event').length
    const snapshots = filteredData.filter(item => item.type === 'snapshot').length

    setSearchResults(filteredData)
    setSearchStats({
      total: filteredData.length,
      events,
      snapshots,
      searchTime
    })
    setIsSearching(false)
  }

  // Handle search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, searchType, sortBy])

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'event': return <Database className="w-4 h-4" />
      case 'snapshot': return <ImageIcon className="w-4 h-4" />
      default: return <Tag className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getLevelBadgeVariant = (level) => {
    switch (level) {
      case 'ERROR': return 'destructive'
      case 'WARNING': return 'secondary'
      case 'INFO': return 'default'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Search</h1>
          <p className="text-muted-foreground">
            Search across all events, snapshots, and system data
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Search className="w-3 h-3" />
            <span>Global Search</span>
          </Badge>
          
          <Badge variant="secondary">Live Demo Data</Badge>
        </div>
      </div>

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Advanced Search</span>
          </CardTitle>
          <CardDescription>
            Search across events, snapshots, cameras, and system logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, snapshots, cameras, IDs, descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                  <SelectItem value="snapshot">Snapshots</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Stats */}
            {searchQuery && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>{searchStats.total}</strong> results found
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">{searchStats.events} events</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{searchStats.snapshots} snapshots</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Search completed in {searchStats.searchTime}ms</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            {searchQuery ? `Results for "${searchQuery}"` : 'Enter a search query to see results'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Searching...</p>
              </div>
            </div>
          ) : !searchQuery ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Start searching</p>
                <p className="text-sm text-muted-foreground">
                  Enter keywords to search across events, snapshots, and system data
                </p>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No results found</p>
                <p className="text-sm text-muted-foreground">
                  Try different keywords or adjust your search filters
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Location/Path</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(result.type)}
                        <Badge variant="outline" className="capitalize">
                          {result.type}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell className="font-mono text-sm">
                      {result.id}
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {result.topic || result.snapshot_type}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.description}
                        </div>
                        {result.level && (
                          <Badge variant={getLevelBadgeVariant(result.level)} className="text-xs">
                            {result.level}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {result.type === 'event' ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span className="text-xs">
                            {result.latitude?.toFixed(4)}, {result.longitude?.toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <div className="font-mono text-xs max-w-xs truncate">
                          {result.path}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span className="text-sm">
                          {formatTimestamp(result.start_time || result.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(result.status)}
                        {result.status && (
                          <span className="text-sm capitalize">{result.status}</span>
                        )}
                        {result.size && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(result.size)}
                          </span>
                        )}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(SearchView)

