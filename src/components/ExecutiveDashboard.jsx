import { useState, useEffect } from 'react'
import { RealTimeUpdates } from './RealTimeUpdates'
import { 
  Activity, 
  Camera, 
  MapPin, 
  Image, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [timeRange, setTimeRange] = useState('30m')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch metrics
      const metricsResponse = await fetch(`${API_BASE}/dashboard/metrics?timeRange=${timeRange}`)
      if (!metricsResponse.ok) throw new Error('Failed to fetch metrics')
      const metricsData = await metricsResponse.json()
      setMetrics(metricsData)

      // Fetch timeline data
      const timelineResponse = await fetch(`${API_BASE}/dashboard/timeline?timeRange=${timeRange}`)
      if (!timelineResponse.ok) throw new Error('Failed to fetch timeline')
      const timelineData = await timelineResponse.json()
      setTimeline(timelineData.data || [])

    } catch (err) {
      setError(err.message)
      console.error('Dashboard data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 5 minutes (300 seconds)
    const interval = setInterval(fetchDashboardData, 300000)
    
    // Listen for real-time events to trigger refresh
    const handleDashboardRefresh = () => {
      fetchDashboardData()
    }
    
    window.addEventListener('dashboard-refresh', handleDashboardRefresh)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('dashboard-refresh', handleDashboardRefresh)
    }
  }, [timeRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          <div className="animate-pulse bg-muted h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-muted h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Executive Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span>Error loading dashboard data: {error}</span>
            </div>
            <Button onClick={fetchDashboardData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const kpiCards = [
    {
      title: 'Total Events',
      value: metrics?.totalEvents || 0,
      change: metrics?.recentEvents || 0,
      changeLabel: `${timeRange} period`,
      icon: Activity,
      color: 'text-blue-500'
    },
    {
      title: 'Active Cameras',
      value: metrics?.cameraActivity?.length || 0,
      change: metrics?.cameraActivity?.[0]?.event_count || 0,
      changeLabel: 'Most active',
      icon: Camera,
      color: 'text-green-500'
    },
    {
      title: 'Geo-Located Events',
      value: metrics?.geoDistribution?.find(g => g.location_status === 'with_location')?.count || 0,
      change: Math.round(((metrics?.geoDistribution?.find(g => g.location_status === 'with_location')?.count || 0) / (metrics?.totalEvents || 1)) * 100),
      changeLabel: '% with location',
      icon: MapPin,
      color: 'text-purple-500'
    },
    {
      title: 'Snapshots',
      value: metrics?.totalSnapshots || 0,
      change: metrics?.snapshotsWithImages || 0,
      changeLabel: 'with images',
      icon: Image,
      color: 'text-orange-500'
    }
  ]

  const eventTypeData = metrics?.eventTypes?.map(type => ({
    name: type.topic,
    value: type.count,
    fill: `hsl(${Math.random() * 360}, 70%, 50%)`
  })) || []

  const cameraActivityData = metrics?.cameraActivity?.slice(0, 5).map(camera => ({
    name: camera.channel_name?.split(' - ')[1] || `Camera ${camera.channel_id}`,
    events: camera.event_count
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of IREX event monitoring system
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30m">Last 30 minutes</SelectItem>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="4h">Last 4 hours</SelectItem>
              <SelectItem value="12h">Last 12 hours</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value.toLocaleString()}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>{kpi.change}</span>
                <span>{kpi.changeLabel}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Event Types Distribution</CardTitle>
            <CardDescription>
              Breakdown of event types in the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Camera Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Top Camera Activity</CardTitle>
            <CardDescription>
              Most active cameras by event count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cameraActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="events" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Timeline</CardTitle>
            <CardDescription>
              Event activity over time in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time_bucket" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="event_count" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3}
                  name="Events"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>System Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Database</span>
                <Badge variant="default">Online</Badge>
              </div>
              <div className="flex justify-between">
                <span>API Services</span>
                <Badge variant="default">Healthy</Badge>
              </div>
              <div className="flex justify-between">
                <span>Data Ingestion</span>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>Last event: {new Date().toLocaleTimeString()}</div>
              <div>Data refresh: {new Date().toLocaleTimeString()}</div>
              <div>System uptime: 99.9%</div>
            </div>
          </CardContent>
        </Card>

        {/* Real-Time Updates */}
        <RealTimeUpdates />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-purple-500" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                View Live Map
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                Export Data
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                System Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

