import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Clock, 
  Zap, 
  Bell,
  Settings,
  Pause,
  Play,
  RefreshCw
} from 'lucide-react'

// Simulate real-time events for demonstration
const generateMockEvent = () => {
  const eventTypes = ['FaceNotMatched', 'FaceMatched', 'MotionDetected', 'SystemAlert']
  const levels = ['INFO', 'WARNING', 'ERROR']
  const cameras = ['Camera 1088', 'Camera 1089', 'Camera 1090']
  
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    topic: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    level: levels[Math.floor(Math.random() * levels.length)],
    camera: cameras[Math.floor(Math.random() * cameras.length)],
    timestamp: new Date().toISOString(),
    description: `Real-time event from ${cameras[Math.floor(Math.random() * cameras.length)]}`
  }
}

export function RealTimeUpdates() {
  const [isConnected, setIsConnected] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [recentEvents, setRecentEvents] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('connected')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [eventCount, setEventCount] = useState(0)

  // Simulate real-time connection
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      // Simulate occasional connection issues
      const shouldDisconnect = Math.random() < 0.05 // 5% chance
      
      if (shouldDisconnect && isConnected) {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        setTimeout(() => {
          setIsConnected(true)
          setConnectionStatus('reconnecting')
          setTimeout(() => {
            setConnectionStatus('connected')
          }, 2000)
        }, 3000)
        return
      }

      if (isConnected && connectionStatus === 'connected') {
        // Generate new event
        const newEvent = generateMockEvent()
        setRecentEvents(prev => [newEvent, ...prev.slice(0, 9)]) // Keep last 10 events
        setLastUpdate(new Date())
        setEventCount(prev => prev + 1)

        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('dashboard-refresh', { detail: newEvent }))
      }
    }, 15000 + Math.random() * 10000) // Random interval between 15-25 seconds

    return () => clearInterval(interval)
  }, [isConnected, isPaused, connectionStatus])

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500'
      case 'disconnected': return 'text-red-500'
      case 'reconnecting': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className={`w-4 h-4 ${getStatusColor()}`} />
      case 'disconnected': return <WifiOff className={`w-4 h-4 ${getStatusColor()}`} />
      case 'reconnecting': return <RefreshCw className={`w-4 h-4 ${getStatusColor()} animate-spin`} />
      default: return <WifiOff className={`w-4 h-4 ${getStatusColor()}`} />
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Real-Time Updates</span>
            </CardTitle>
            <CardDescription>
              Live event stream from ELI Demo system
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-sm">
                  <strong>{eventCount}</strong> events received
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm">
                  Last update: {formatTime(lastUpdate)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <span className="text-sm">
                  {recentEvents.length} recent events
                </span>
              </div>
            </div>
            
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </div>

          {/* Recent Events */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Events</h4>
            
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Waiting for real-time events...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border transition-all duration-300 ${
                      index === 0 ? 'bg-blue-50 border-blue-200 animate-pulse' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant={getLevelBadgeVariant(event.level)} className="text-xs">
                          {event.level}
                        </Badge>
                        <span className="font-medium text-sm">{event.topic}</span>
                        <span className="text-sm text-muted-foreground">{event.camera}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connection Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Real-time updates simulate live data from the ELI Demo system</p>
            <p>• Events are generated every 3-5 seconds when connected</p>
            <p>• Connection status and events update automatically</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

