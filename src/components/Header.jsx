import { useState, useEffect } from 'react'
import {
  Menu,
  ChevronRight,
  Moon,
  Sun,
  Bell,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import AlertCenterList from '@/components/AlertCenter'
import SettingsDialog from '@/components/SettingsDialog'
import { useAlerts } from '@/context/AlertsContext'

export function Header({ sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode, onLogout }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [notifOpen, setNotifOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { unackedCount, ackAll } = useAlerts()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    setLastUpdate(new Date())
    // Trigger data refresh in parent components
    window.dispatchEvent(new CustomEvent('dashboard-refresh'))
  }

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <Menu className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </Button>

          <img
            src="/images/eli-logo.jpg"
            alt="ELI Logo"
            className="h-8 w-auto mr-4"
          />

          <div>
            <h2 className="text-xl font-semibold">ELI Demo Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Real-time Intelligence & Event Monitoring
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>

          {/* Last Update */}
          <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Last update:</span>
            <span>{lastUpdate.toLocaleTimeString()}</span>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="hidden sm:flex"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          {/* Notifications */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                {unackedCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                    title={`${unackedCount} new alerts`}
                  >
                    {Math.min(unackedCount, 9)}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="p-2">
              <AlertCenterList onAckAll={() => { ackAll(); setNotifOpen(false) }} />
            </PopoverContent>
          </Popover>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} title="Settings">
            <Settings className="w-5 h-5" />
          </Button>

          {/* Current Time */}
          <div className="hidden lg:flex flex-col items-end text-sm">
            <span className="font-medium">
              {currentTime.toLocaleTimeString()}
            </span>
            <span className="text-muted-foreground">
              {currentTime.toLocaleDateString()}
            </span>
          </div>

          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </div>
    </header>
  )
}

