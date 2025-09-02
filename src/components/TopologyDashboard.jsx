import { useState, useEffect, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { 
  Network, 
  Camera, 
  Image, 
  Tag, 
  Activity,
  Filter,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Settings,
  Info
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

const API_BASE = 'http://localhost:5000/api'

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

export function TopologyDashboard() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodeTypes, setNodeTypes] = useState(['Camera', 'Event', 'Image'])
  const [depth, setDepth] = useState(2)
  const [showLabels, setShowLabels] = useState(true)
  const [graphWidth, setGraphWidth] = useState(800)
  const [graphHeight, setGraphHeight] = useState(600)
  const graphRef = useRef()

  const fetchGraphData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        depth: depth.toString(),
        limit: '100'
      })
      
      nodeTypes.forEach(type => params.append('nodeTypes', type))

      const response = await fetch(`${API_BASE}/dashboard/graph?${params}`)
      if (!response.ok) throw new Error('Failed to fetch graph data')
      
      const data = await response.json()
      
      // Transform data for react-force-graph
      const transformedData = {
        nodes: data.nodes.map(node => ({
          id: node.id,
          name: node.label,
          type: node.type,
          properties: node.properties,
          color: nodeConfig[node.type]?.color || nodeConfig.default.color,
          size: nodeConfig[node.type]?.size || nodeConfig.default.size,
          icon: nodeConfig[node.type]?.icon || nodeConfig.default.icon
        })),
        links: data.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          type: edge.type,
          label: edge.label,
          color: edgeConfig[edge.type]?.color || edgeConfig.default.color,
          width: edgeConfig[edge.type]?.width || edgeConfig.default.width
        }))
      }

      setGraphData(transformedData)

    } catch (err) {
      setError(err.message)
      console.error('Graph data fetch error:', err)
      
      // Create sample data for demonstration
      const sampleData = {
        nodes: [
          { id: 'camera1', name: 'Camera 1088', type: 'Camera', color: '#3b82f6', size: 8 },
          { id: 'event1', name: 'FaceNotMatched', type: 'Event', color: '#ef4444', size: 6 },
          { id: 'event2', name: 'FaceNotMatched', type: 'Event', color: '#ef4444', size: 6 },
          { id: 'image1', name: 'Snapshot 1', type: 'Image', color: '#22c55e', size: 4 },
          { id: 'image2', name: 'Snapshot 2', type: 'Image', color: '#22c55e', size: 4 },
          { id: 'tag1', name: 'Face Detection', type: 'Tag', color: '#f59e0b', size: 3 }
        ],
        links: [
          { source: 'camera1', target: 'event1', type: 'GENERATED', color: '#3b82f6', width: 2 },
          { source: 'camera1', target: 'event2', type: 'GENERATED', color: '#3b82f6', width: 2 },
          { source: 'event1', target: 'image1', type: 'HAS_SNAPSHOT', color: '#22c55e', width: 1.5 },
          { source: 'event2', target: 'image2', type: 'HAS_SNAPSHOT', color: '#22c55e', width: 1.5 },
          { source: 'event1', target: 'tag1', type: 'TAGGED', color: '#f59e0b', width: 1 },
          { source: 'event2', target: 'tag1', type: 'TAGGED', color: '#f59e0b', width: 1 }
        ]
      }
      setGraphData(sampleData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGraphData()
  }, [depth, nodeTypes])

  useEffect(() => {
    const handleRefresh = () => fetchGraphData()
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [depth, nodeTypes])

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Network Topology</h1>
          <div className="animate-pulse bg-muted h-10 w-32 rounded"></div>
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse flex items-center justify-center">
          <p>Loading network topology...</p>
        </div>
      </div>
    )
  }

  const nodeStats = getNodeStats()
  const edgeStats = getEdgeStats()

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
          
          <Button onClick={fetchGraphData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Depth Level</label>
              <Slider
                value={[depth]}
                onValueChange={(value) => setDepth(value[0])}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">Level: {depth}</span>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Node Types</label>
              <div className="flex flex-wrap gap-2">
                {['Camera', 'Event', 'Image', 'Tag'].map(type => (
                  <Badge
                    key={type}
                    variant={nodeTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (nodeTypes.includes(type)) {
                        setNodeTypes(nodeTypes.filter(t => t !== type))
                      } else {
                        setNodeTypes([...nodeTypes, type])
                      }
                    }}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
            
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
                <span>Network Graph</span>
              </CardTitle>
              <CardDescription>
                Click and drag to explore. Click nodes for details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && !graphData.nodes.length ? (
                <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-destructive mb-2">Error loading graph: {error}</p>
                    <p className="text-sm text-muted-foreground">Showing sample data for demonstration</p>
                  </div>
                </div>
              ) : null}
              
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

