import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Check if setup is required
      const statusRes = await api.get('/auth/status')

      if (statusRes.data.setupRequired) {
        setSetupRequired(true)
        setLoading(false)
        return
      }

      // Try to get current user
      const token = localStorage.getItem('token')
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        try {
          const userRes = await api.get('/auth/me')
          setUser(userRes.data)
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('token')
          delete api.defaults.headers.common['Authorization']
        }
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token, user } = response.data

    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)

    return user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore errors
    }

    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const setup = async (email, password, name) => {
    const response = await api.post('/auth/setup', { email, password, name })
    const { token, user } = response.data

    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)
    setSetupRequired(false)

    return user
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setupRequired,
        isAuthenticated: !!user,
        login,
        logout,
        setup,
        checkAuthStatus,
      }}
    >
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
