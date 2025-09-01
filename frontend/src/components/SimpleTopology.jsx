import { useState, useEffect, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import {
  Network,
  Camera,
  Image,
  Tag,
  Activity,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

// Node type colors and sizes
const nodeConfig = {
  Camera: { color: '#3b82f6', size: 8, icon: '📹' },
  Event: { color: '#ef4444', size: 6, icon: '⚡' },
  Image: { color: '#22c55e', size: 4, icon: '🖼️' },
  Tag: { color: '#f59e0b', size: 3, icon: '🏷️' },
  default: { color: '#6b7280', size: 5, icon: '⚪' }
}

// Edge type colors
const edgeConfig = {
  GENERATED: { color: '#3b82f6', width: 2 },
  HAS_SNAPSHOT: { color: '#22c55e', width: 1.5 },
  TAGGED: { color: '#f59e0b', width: 1 },
  default: { color: '#6b7280', width: 1 }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export function SimpleTopology() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState(null)
  const [showLabels, setShowLabels] = useState(true)
  const [graphWidth, setGraphWidth] = useState(800)
  const [graphHeight, setGraphHeight] = useState(600)
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const graphRef = useRef()

  const colorForType = (type) => nodeConfig[type]?.color || nodeConfig.default.color
  const sizeForType = (type) => nodeConfig[type]?.size || nodeConfig.default.size

  const buildGraph = (events = [], snapshots = [], cameras = []) => {
    const nodesMap = new Map()
    const links = []

    // Cameras
    cameras.forEach(c => {
      const id = String(c.channel_id)
      if (!nodesMap.has(`camera-${id}`)) {
        nodesMap.set(`camera-${id}`, {
          id: `camera-${id}`,
          name: c.channel_name || `Camera ${id}`,
          type: 'Camera',
          color: colorForType('Camera'),
          size: sizeForType('Camera'),
          properties: {
            id,
            name: c.channel_name,
            type: c.channel_type
          }
        })
      }
    })

    // Events -> link to camera
    events.forEach(e => {
      const eventId = String(e.id)
      const camId = e.channel_id != null ? String(e.channel_id) : ''
      const eventNode = {
        id: `event-${eventId}`,
        name: `${e.topic || 'Event'} ${eventId}`,
        type: 'Event',
        color: colorForType('Event'),
        size: sizeForType('Event'),
        properties: {
          topic: e.topic,
          level: e.level,
          channel_id: camId,
          channel_name: e.channel_name,
          timestamp: e.start_time
        }
      }
      nodesMap.set(eventNode.id, eventNode)

      if (camId && nodesMap.has(`camera-${camId}`)) {
        links.push({ source: `camera-${camId}`, target: eventNode.id, type: 'GENERATED', color: edgeConfig.GENERATED.color, width: edgeConfig.GENERATED.width })
      }
    })

    // Snapshots -> link to event
    snapshots.forEach(s => {
      const snapId = String(s.id)
      const evId = String(s.event_id)
      const imgNode = {
        id: `image-${snapId}`,
        name: `Snapshot ${snapId}`,
        type: 'Image',
        color: colorForType('Image'),
        size: sizeForType('Image'),
        properties: { type: s.type, path: s.path, image_url: s.image_url }
      }
      nodesMap.set(imgNode.id, imgNode)
      if (evId) {
        links.push({ source: `event-${evId}`, target: imgNode.id, type: 'HAS_SNAPSHOT', color: edgeConfig.HAS_SNAPSHOT.color, width: edgeConfig.HAS_SNAPSHOT.width })
      }
    })

    return { nodes: Array.from(nodesMap.values()), links }
  }

  const fetchGraphData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ page: '1', limit: '200', timeRange: '30m' })
      const [eventsRes, camsRes, snapsRes] = await Promise.all([
        fetch(`${API_BASE}/events?${params.toString()}`),
        fetch(`${API_BASE}/events/cameras`),
        fetch(`${API_BASE}/snapshots?${params.toString()}`)
      ])
      if (!eventsRes.ok || !camsRes.ok || !snapsRes.ok) throw new Error('Failed to fetch graph data')
      const eventsJson = await eventsRes.json()
      const camsJson = await camsRes.json()
      const snapsJson = await snapsRes.json()
      const graph = buildGraph(eventsJson.events || [], snapsJson.snapshots || [], camsJson.cameras || [])
      setGraphData(graph)
      setIsLive(true)
    } catch (err) {
      console.error('Topology fetch error:', err)
      setError(err.message)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGraphData()
    const onRefresh = () => fetchGraphData()
    window.addEventListener('dashboard-refresh', onRefresh)
    return () => window.removeEventListener('dashboard-refresh', onRefresh)
  }, [])


  const handleNodeClick = (node) => {
    setSelectedNode(node)
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000)
      graphRef.current.zoom(2, 1000)
    }
  }

  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom * 1.5, 500)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom / 1.5, 500)
    }
  }

  const handleFitToView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400)
    }
  }

  const getNodeStats = () => {
    const stats = {}
    graphData.nodes.forEach(node => {
      stats[node.type] = (stats[node.type] || 0) + 1
    })
    return stats
  }

  const getEdgeStats = () => {
    const stats = {}
    graphData.links.forEach(link => {
      stats[link.type] = (stats[link.type] || 0) + 1
    })
    return stats
  }

  const nodeStats = getNodeStats()
  const edgeStats = getEdgeStats()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Network Topology</h1>
          <div className="animate-pulse bg-muted h-10 w-32 rounded" />
        </div>

            <div className="flex items-center space-x-2">
              <Button onClick={fetchGraphData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
              {error && (
                <span className="text-xs text-destructive">{error}</span>
              )}
            </div>

        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Network Topology</h1>
          <p className="text-muted-foreground">
            Interactive graph visualization of camera, event, and image relationships
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Network className="w-3 h-3" />
            <span>{graphData.nodes.length} nodes</span>
          </Badge>

          <Badge variant="outline" className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>{graphData.links.length} edges</span>
          </Badge>

          <Badge variant={isLive ? "default" : "secondary"}>{isLive ? 'Live Data' : 'Demo Data'}</Badge>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Graph Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Display Options</label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                />
                <span className="text-sm">Show Labels</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Graph Controls</label>
              <div className="flex space-x-2">
                <Button onClick={handleZoomIn} variant="outline" size="sm">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button onClick={handleZoomOut} variant="outline" size="sm">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button onClick={handleFitToView} variant="outline" size="sm">
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Legend</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(nodeConfig).filter(([key]) => key !== 'default').map(([type, config]) => (
                  <Badge key={type} variant="outline" className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-xs">{type}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Visualization */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="w-5 h-5" />
                <span>Network Graph - ELI Demo System</span>
              </CardTitle>
              <CardDescription>
                Click and drag to explore. Click nodes for details. This shows the actual structure of your Lima camera system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 rounded-lg overflow-hidden border">
                <ForceGraph2D
                  ref={graphRef}
                  graphData={graphData}
                  width={graphWidth}
                  height={graphHeight}
                  nodeLabel={showLabels ? 'name' : ''}
                  nodeColor="color"
                  nodeVal="size"
                  linkColor="color"
                  linkWidth="width"
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={1}
                  onNodeClick={handleNodeClick}
                  nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name
                    const fontSize = 12/globalScale
                    ctx.font = `${fontSize}px Sans-Serif`

                    // Draw node
                    ctx.fillStyle = node.color
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI, false)
                    ctx.fill()

                    // Draw label if enabled
                    if (showLabels && globalScale > 0.5) {
                      ctx.textAlign = 'center'
                      ctx.textBaseline = 'middle'
                      ctx.fillStyle = '#000'
                      ctx.fillText(label, node.x, node.y + node.size + fontSize)
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel */}
        <div>
          {/* Selected Node Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Node Details</CardTitle>
              <CardDescription>
                {selectedNode ? 'Selected node information' : 'Click on a node to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedNode.name}</h3>
                    <Badge variant="outline">{selectedNode.type}</Badge>
                  </div>

                  {selectedNode.properties && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Properties:</h4>
                      <div className="text-sm space-y-1">
                        {Object.entries(selectedNode.properties).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono text-xs">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a node to view details</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Graph Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Graph Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Node Types</h4>
                  <div className="space-y-2">
                    {Object.entries(nodeStats).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: nodeConfig[type]?.color || nodeConfig.default.color }}
                          />
                          <span className="text-sm">{type}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Relationships</h4>
                  <div className="space-y-2">
                    {Object.entries(edgeStats).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-1 rounded"
                            style={{ backgroundColor: edgeConfig[type]?.color || edgeConfig.default.color }}
                          />
                          <span className="text-sm">{type}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

