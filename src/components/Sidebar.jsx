import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Map,
  Network,
  Table,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  Eye,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Executive Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Geographic Map', href: '/map', icon: Map },
  { name: 'Topology', href: '/topology', icon: Network },
  { name: 'Data Table', href: '/table', icon: Table },
  { name: 'Search', href: '/search', icon: Search },
]

export function Sidebar({ open, setOpen }) {
  const location = useLocation()

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300",
        open ? "w-64" : "w-16",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className={cn(
            "flex items-center space-x-3 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0 lg:opacity-0"
          )}>
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ELI Dashboard</h1>
              <p className="text-xs text-muted-foreground">TruContext Intelligence</p>
            </div>
          </div>
          
          <button
            onClick={() => setOpen(!open)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
            title={open ? "Minimize sidebar" : "Maximize sidebar"}
          >
            {open ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground",
                  !open && "justify-center"
                )}
                title={!open ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className={cn(
                  "transition-opacity duration-300",
                  open ? "opacity-100" : "opacity-0 lg:opacity-0"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className={cn(
            "flex items-center space-x-3 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0 lg:opacity-0"
          )}>
            <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-lg">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Live Data</p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          
          {!open && (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

