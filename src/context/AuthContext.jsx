import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  const checkAuth = async () => {
    const storedToken = sessionStorage.getItem('authToken')
    if (!storedToken) {
      setLoading(false)
      return false
    }

    try {
      const response = await fetch(`${API_BASE}/login`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Origin': window.location.origin,
        },
        credentials: 'include',
      })
      
      if (response.ok) {
        setToken(storedToken)
        setIsAuthenticated(true)
        setLoading(false)
        return true
      } else {
        sessionStorage.removeItem('authToken')
        setToken(null)
        setIsAuthenticated(false)
        setLoading(false)
        return false
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      sessionStorage.removeItem('authToken')
      setToken(null)
      setIsAuthenticated(false)
      setLoading(false)
      return false
    }
  }

  const login = async (password) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
        },
        body: JSON.stringify({ password }),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        sessionStorage.setItem('authToken', data.token)
        setToken(data.token)
        setIsAuthenticated(true)
        return { success: true }
      } else {
        return { success: false, error: 'Invalid password' }
      }
    } catch (err) {
      console.error('Login failed:', err)
      return { success: false, error: 'Login failed' }
    }
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/login`, {
        method: 'DELETE',
        headers: {
          'Origin': window.location.origin,
        },
        credentials: 'include'
      })
    } catch (err) {
      // Ignore network errors during logout
    }
    
    sessionStorage.removeItem('authToken')
    setToken(null)
    setIsAuthenticated(false)
  }

  // Enhanced authFetch that uses the context token
  const authFetch = async (url, options = {}) => {
    const currentToken = token || sessionStorage.getItem('authToken')

    if (!currentToken) {
      throw new Error('No authentication token available')
    }

    const headers = {
      'Origin': window.location.origin,
      ...options.headers,
      'Authorization': `Bearer ${currentToken}`
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const value = {
    isAuthenticated,
    loading,
    token,
    login,
    logout,
    authFetch,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
