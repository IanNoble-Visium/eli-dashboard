import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import ExecutiveDashboard from '@/components/ExecutiveDashboard'
import GeographicMap from '@/components/GeographicMap'
import SimpleTopology from '@/components/SimpleTopology'
import TableView from '@/components/TableView'
import SearchView from '@/components/SearchView'
import Login from '@/components/Login'
import { useAuth } from '@/context/AuthContext'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const { isAuthenticated, loading, logout } = useAuth()

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            onLogout={logout}
          />

          <main className="p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ExecutiveDashboard />} />
              <Route path="/map" element={<GeographicMap />} />
              <Route path="/geographic-map" element={<GeographicMap />} />
              <Route path="/topology" element={<SimpleTopology />} />
              <Route path="/table" element={<TableView />} />
              <Route path="/search" element={<SearchView />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
