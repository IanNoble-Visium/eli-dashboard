import { useState, useEffect, useRef, memo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import {
  Network,
  Camera,
  Tag,
  Activity,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize2,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import TimeRangeSelector from '@/components/TimeRangeSelector'
import { useTimeRange } from '@/context/TimeRangeContext'
import { useAuth } from '@/context/AuthContext'


// Node type colors and sizes
const nodeConfig = {
  Camera: { color: '#3b82f6', size: 8, icon: '📹' },
  Event: { color: '#ef4444', size: 6, icon: '⚡' },
  Image: { color: '#22c55e', size: 4, icon: '🖼️' },
  Tag: { color: '#f59e0b', size: 3, icon: '🏷️' },
  FaceIdentity: { color: '#8b5cf6', size: 5, icon: '🙂' },
  PlateIdentity: { color: '#0ea5e9', size: 5, icon: '🚗' },
  Watchlist: { color: '#10b981', size: 4, icon: '📋' },
  default: { color: '#6b7280', size: 5, icon: '⚪' }
}

// Edge type colors
const edgeConfig = {
  GENERATED: { color: '#3b82f6', width: 2 },
  HAS_SNAPSHOT: { color: '#22c55e', width: 1.5 },
  TAGGED: { color: '#f59e0b', width: 1 },
  MATCHED_FACE: { color: '#8b5cf6', width: 1.5 },
  MATCHED_PLATE: { color: '#0ea5e9', width: 1.5 },
  IN_LIST: { color: '#10b981', width: 1 },
  default: { color: '#6b7280', width: 1 }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

function SimpleTopology() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState(null)
  const [showImages, setShowImages] = useState(true)
  const [graphWidth, setGraphWidth] = useState(800)
  const [graphHeight, setGraphHeight] = useState(600)
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fullPage, setFullPage] = useState(false)
  const [visibleNodeTypes, setVisibleNodeTypes] = useState(Object.keys(nodeConfig).filter(key => key !== 'default'))
  const { timeRange, debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const { authFetch, isAuthenticated } = useAuth()
  const graphRef = useRef()
  const imageCacheRef = useRef(new Map())

  const colorForType = (type) => nodeConfig[type]?.color || nodeConfig.default.color
  const sizeForType = (type) => nodeConfig[type]?.size || nodeConfig.default.size

  const buildGraphFromNeo = (data) => {
    const nodes = (data.nodes || []).map(n => ({
      id: n.id,
      name: n.label,
      type: n.type,
      properties: n.properties,
      color: colorForType(n.type),
      size: sizeForType(n.type)
    }))
    const links = (data.edges || []).map(e => ({
      source: e.source,
      target: e.target,
      type: e.type,
      color: edgeConfig[e.type]?.color || edgeConfig.default.color,
      width: edgeConfig[e.type]?.width || edgeConfig.default.width
    }))
    return { nodes, links }
  }

  const fetchGraphData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit: '300' })
      if (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end) {
        params.set('start', String(debouncedAbsoluteRange.start))
        params.set('end', String(debouncedAbsoluteRange.end))
      } else {
        params.set('timeRange', debouncedTimeRange)
      }
      const res = await authFetch(`${API_BASE}/dashboard/graph?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch graph data')
      const neoGraph = await res.json()
      const graph = buildGraphFromNeo(neoGraph)
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
    if (!isAuthenticated) return

    fetchGraphData()
    const onRefresh = () => fetchGraphData()
    window.addEventListener('dashboard-refresh', onRefresh)
    return () => window.removeEventListener('dashboard-refresh', onRefresh)
  }, [debouncedTimeRange, debouncedAbsoluteRange, isAuthenticated])

  // Refresh canvas when toggling image display so visuals update immediately
  useEffect(() => {
    if (graphRef.current) {
      try { graphRef.current.refresh() } catch (_) {}
    }
  }, [showImages])



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

  const filteredNodes = graphData.nodes.filter(node => visibleNodeTypes.includes(node.type))
  const nodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredLinks = graphData.links.filter(link => nodeIds.has(link.source) && nodeIds.has(link.target))
  const filteredGraphData = { nodes: filteredNodes, links: filteredLinks }

  const nodeStats = getNodeStats(filteredNodes)
  const edgeStats = getEdgeStats(filteredLinks)


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
            <span>{filteredNodes.length} nodes</span>
          </Badge>

          <Badge variant="outline" className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>{filteredLinks.length} edges</span>
          </Badge>

          <Badge variant={isLive ? "default" : "secondary"}>{isLive ? 'Live Data' : 'Demo Data'}</Badge>

          <Button onClick={() => setFullPage(!fullPage)} variant="outline" size="sm">
            {fullPage ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
            {fullPage ? 'Exit Full Page' : 'Full Page'}
          </Button>
        </div>
      </div>

      {/* Controls */}
      {!fullPage && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <TimeRangeSelector />
            </div>

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
                  checked={showImages}
                  onCheckedChange={setShowImages}
                />
                <span className="text-sm">Show Images</span>
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
                  <Badge
                    key={type}
                    variant={visibleNodeTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer flex items-center space-x-1"
                    onClick={() => {
                      if (visibleNodeTypes.includes(type)) {
                        setVisibleNodeTypes(visibleNodeTypes.filter(t => t !== type))
                      } else {
                        setVisibleNodeTypes([...visibleNodeTypes, type])
                      }
                    }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-xs">{type}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Graph and Details */}
      <div className={`grid grid-cols-1 ${fullPage ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-6`}>
        {/* Graph Visualization */}
        <div className={fullPage ? "lg:col-span-1" : "lg:col-span-3"}>
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
              <div className="h-96 rounded-lg overflow-hidden border relative">
                {loading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p>Loading topology data...</p>
                    </div>
                  </div>
                )}
                <ForceGraph2D
                  ref={graphRef}
                  graphData={filteredGraphData}
                  width={graphWidth}
                  height={graphHeight}
                  nodeLabel={''}
                  nodeColor="color"
                  nodeVal="size"
                  linkColor="color"
                  linkWidth="width"
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={1}
                  minMap={true}
                  onNodeClick={handleNodeClick}
                  // Replace default node drawing so we control circles vs images
                  nodeCanvasObjectMode={() => 'replace'}
                  // Ensure pointer interactions match the visual (circular area)
                  nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI, false)
                    ctx.fill()
                  }}
                  nodeCanvasObject={(node, ctx, globalScale) => {
                    const radius = node.size
                    const isImageNode = node.type === 'Image'
                    const url = isImageNode ? (node.properties?.image_url || node.properties?.url || node.properties?.path) : null
                    const shouldDrawImage = Boolean(showImages && isImageNode && url)

                    if (shouldDrawImage) {
                      let img = imageCacheRef.current.get(url)

                      if (!img) {
                        img = new window.Image()
                        img.crossOrigin = 'anonymous'
                        img.onload = () => {
                          imageCacheRef.current.set(url, img)
                          if (graphRef.current) {
                            try { graphRef.current.refresh() } catch (_) {}
                          }
                        }
                        img.onerror = () => {
                          imageCacheRef.current.set(url, 'error')
                        }
                        img.src = url
                        imageCacheRef.current.set(url, img)
                      }

                      if (img && img !== 'error' && img.complete && img.naturalWidth > 0) {
                        const size = Math.max(12, radius * 2)
                        try {
                          // Draw as a circular clipped image
                          ctx.save()
                          ctx.beginPath()
                          ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI, false)
                          ctx.closePath()
                          ctx.clip()
                          ctx.drawImage(img, node.x - size / 2, node.y - size / 2, size, size)
                          ctx.restore()
                          // Optional subtle ring
                          ctx.strokeStyle = '#ffffff'
                          ctx.lineWidth = 1
                          ctx.beginPath()
                          ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI)
                          ctx.stroke()
                        } catch (_) {}
                        return
                      }

                      // Placeholder while image loads or on error
                      ctx.fillStyle = '#e5e7eb'
                      ctx.beginPath()
                      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
                      ctx.fill()
                      return
                    }

                    // Default: draw colored circle
                    ctx.fillStyle = node.color
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
                    ctx.fill()
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel */}
        {!fullPage && (
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
                      <div
                        key={type}
                        className="flex justify-between items-center cursor-pointer hover:bg-muted/50 p-1 rounded"
                        onClick={() => {
                          if (visibleNodeTypes.includes(type)) {
                            setVisibleNodeTypes(visibleNodeTypes.filter(t => t !== type))
                          } else {
                            setVisibleNodeTypes([...visibleNodeTypes, type])
                          }
                        }}
                      >
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
        )}
      </div>
    </div>
  )
}

export default memo(SimpleTopology)

