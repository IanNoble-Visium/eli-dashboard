import { useState, useEffect, memo, useMemo, useCallback } from 'react'
import { RealTimeUpdates } from './RealTimeUpdates'
import WatchlistBreakdownCard from './WatchlistBreakdownCard'
import FaceIdentitiesPanel from './FaceIdentitiesPanel'
import PlateIdentitiesPanel from './PlateIdentitiesPanel'
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
  Eye,
  RefreshCw,
  BarChart3,
  RotateCcw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import TimeRangeSelector from '@/components/TimeRangeSelector'
import { useTimeRange } from '@/context/TimeRangeContext'
import { useAuth } from '@/context/AuthContext'
import {
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
  ResponsiveContainer,
  Brush
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

// Helper functions for time range calculations
const parseTimeRange = (timeRange) => {
  const now = new Date()
  const match = timeRange.match(/^(\d+)([mhd])$/)
  if (!match) return { start: now, end: now }

  const [, amount, unit] = match
  const value = parseInt(amount, 10)
  const start = new Date(now)

  switch (unit) {
    case 'm':
      start.setMinutes(start.getMinutes() - value)
      break
    case 'h':
      start.setHours(start.getHours() - value)
      break
    case 'd':
      start.setDate(start.getDate() - value)
      break
    default:
      start.setMinutes(start.getMinutes() - 30) // Default to 30 minutes
  }

  return { start, end: now }
}

const formatDateTime = (date) => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

const formatDuration = (start, end) => {
  const diffMs = end.getTime() - start.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}, ${diffHours % 24} hour${(diffHours % 24) !== 1 ? 's' : ''}`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}, ${diffMinutes % 60} minute${(diffMinutes % 60) !== 1 ? 's' : ''}`
  } else {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
  }
}

function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [timeline, setTimeline] = useState([])
  const { timeRange, debouncedTimeRange, debouncedAbsoluteRange } = useTimeRange()
  const { authFetch, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [eventCounts, setEventCounts] = useState({ filtered: 0, total: 0 })
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const baseParams = new URLSearchParams()
      if (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end) {
        baseParams.set('start', String(debouncedAbsoluteRange.start))
        baseParams.set('end', String(debouncedAbsoluteRange.end))
      } else {
        baseParams.set('timeRange', debouncedTimeRange)
      }
      if (eventTypeFilter && eventTypeFilter !== 'all') baseParams.set('eventType', eventTypeFilter)
      if (categoryFilter && categoryFilter !== 'all') baseParams.set('category', categoryFilter)

      // Fetch metrics
      const metricsResponse = await authFetch(`${API_BASE}/dashboard/metrics?${baseParams.toString()}`)
      if (!metricsResponse.ok) throw new Error('Failed to fetch metrics')
      const metricsData = await metricsResponse.json()
      setMetrics(metricsData)

      // Fetch timeline data
      const timelineResponse = await authFetch(`${API_BASE}/dashboard/timeline?${baseParams.toString()}`)
      if (!timelineResponse.ok) throw new Error('Failed to fetch timeline')
      const timelineData = await timelineResponse.json()
      // Optimize for large datasets: limit to 100 points for performance
      const optimizedTimeline = (timelineData.data || []).slice(-100)
      setTimeline(optimizedTimeline)
      setLastUpdated(new Date())

    } catch (err) {
      setError(err.message)
      console.error('Dashboard data fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return

    fetchDashboardData()

    const interval = setInterval(fetchDashboardData, 300000)
    const handleDashboardRefresh = () => { fetchDashboardData() }
    window.addEventListener('dashboard-refresh', handleDashboardRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('dashboard-refresh', handleDashboardRefresh)
    }
  }, [debouncedTimeRange, debouncedAbsoluteRange, isAuthenticated, eventTypeFilter, categoryFilter])

  // Refresh data function for manual refresh
  const handleRefreshData = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const handleEventCountChange = useCallback((counts) => {
    setEventCounts(counts)
  }, [])

  // Calculate current time range information
  const timeRangeInfo = useMemo(() => {
    let start, end

    if (debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end) {
      start = new Date(debouncedAbsoluteRange.start)
      end = new Date(debouncedAbsoluteRange.end)
    } else {
      const parsed = parseTimeRange(debouncedTimeRange)
      start = parsed.start
      end = parsed.end
    }

    const duration = formatDuration(start, end)
    const eventCount = metrics?.totalEvents || 0

    return {
      start,
      end,
      duration,
      eventCount,
      timeRangeLabel: debouncedTimeRange,
      isAbsolute: !!(debouncedAbsoluteRange?.start && debouncedAbsoluteRange?.end)
    }
  }, [debouncedTimeRange, debouncedAbsoluteRange, metrics])


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
    value: Number(type.count),
    fill: `hsl(${Math.random() * 360}, 70%, 50%)`
  })) || []

  const cameraActivityData = metrics?.cameraActivity?.slice(0, 5).map(camera => ({
    name: camera.channel_name?.split(' - ')[1] || `Camera ${camera.channel_id}`,
    events: Number(camera.event_count)
  })) || []

  return (
    <div className="space-y-3">
      {/* Integrated Time Range Control & Information Panel */}
      <Card className="border-l-4 border-l-primary">

        <CardContent className="space-y-3">
          {/* Time Range Selector Integration */}
          <div className="w-full">
            <TimeRangeSelector onEventCountChange={handleEventCountChange} />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All event types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All event types</SelectItem>
                  {metrics?.eventTypes?.map(type => (
                    <SelectItem key={type.topic} value={type.topic}>{type.topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Range Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Start Time */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Start</span>
              </div>
              <div className="text-sm font-medium">{formatDateTime(timeRangeInfo.start)}</div>
              <div className="text-xs text-muted-foreground">
                {timeRangeInfo.isAbsolute ? 'Custom' : `${timeRangeInfo.timeRangeLabel} ago`}
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>End</span>
              </div>
              <div className="text-sm font-medium">{formatDateTime(timeRangeInfo.end)}</div>
              <div className="text-xs text-muted-foreground">
                {timeRangeInfo.isAbsolute ? 'Custom' : 'Current'}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <BarChart3 className="w-3 h-3" />
                <span>Duration</span>
              </div>
              <div className="text-sm font-medium">{timeRangeInfo.duration}</div>
              <div className="text-xs text-muted-foreground">Time span</div>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="pt-2 border-t space-y-3">
            {/* Events Information & Refresh */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {eventCounts.filtered.toLocaleString()}
                    {eventCounts.filtered !== eventCounts.total && (
                      <span className="text-muted-foreground"> of {eventCounts.total.toLocaleString()}</span>
                    )} Events
                  </span>
                </div>
                <Button
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                >
                  <RotateCcw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Updated: {formatDateTime(lastUpdated)}
              </div>
            </div>


          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <div className="animate-pulse bg-muted h-4 w-20 rounded" />
                <div className="animate-pulse bg-muted h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="pb-2">
                <div className="animate-pulse bg-muted h-6 w-16 rounded mb-2" />
                <div className="animate-pulse bg-muted h-3 w-24 rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          kpiCards.map((kpi, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-xl font-bold">{kpi.value.toLocaleString()}</div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <span>{kpi.change}</span>
                  <span>{kpi.changeLabel}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Event Types Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Event Types Distribution</CardTitle>
            <CardDescription className="text-sm">
              Breakdown of event types in the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent className="relative pb-2">
            {loading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading chart data...</p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height={250}>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Camera Activity</CardTitle>
            <CardDescription className="text-sm">
              Most active cameras by event count
            </CardDescription>
          </CardHeader>
          <CardContent className="relative pb-2">
            {loading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading chart data...</p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height={250}>
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
      {(timeline.length > 0 || loading) && (
        <Card>
          <CardHeader>
            <CardTitle>Event Timeline</CardTitle>
            <CardDescription>
              Event activity over time in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {loading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading timeline data...</p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 300 : 400}>
              <AreaChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time_bucket"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis domain={[0, 'dataMax + 10']} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => [`${value} events`, name]}
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
                <Brush dataKey="time_bucket" height={30} stroke="hsl(var(--primary))" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Insights: Identities and Watchlists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-6">
          <FaceIdentitiesPanel />
          <PlateIdentitiesPanel />
        </div>
        <WatchlistBreakdownCard />
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

export default memo(ExecutiveDashboard)

