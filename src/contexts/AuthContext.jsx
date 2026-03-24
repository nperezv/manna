import { createContext, useContext, useState, useEffect } from 'react'
import { api, setAccessToken, clearTokens } from '../api/client'

const AuthContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [family, setFamily]   = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session from refresh token in localStorage
  useEffect(() => {
    const restore = async () => {
      const refreshToken = localStorage.getItem('manna_refresh_token')
      if (!refreshToken) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })

        if (!res.ok) {
          console.warn('Session restore failed — token expired or invalid')
          localStorage.removeItem('manna_refresh_token')
          setLoading(false)
          return
        }

        const data = await res.json()
        setAccessToken(data.accessToken)
        localStorage.setItem('manna_refresh_token', data.refreshToken)

        // Get family data with new access token
        const familyData = await api.family.get()
        setUser(data.user)
        setFamily(familyData)
      } catch (err) {
        console.error('Session restore error:', err)
        localStorage.removeItem('manna_refresh_token')
      } finally {
        setLoading(false)
      }
    }

    restore()
  }, [])

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password })
    setAccessToken(data.accessToken)
    localStorage.setItem('manna_refresh_token', data.refreshToken)
    setUser(data.user)
    setFamily({ id: data.family.id, name: data.family.name })
    return data
  }

  const register = async ({ familyName, name, email, password }) => {
    const data = await api.auth.register({ familyName, name, email, password })
    setAccessToken(data.accessToken)
    localStorage.setItem('manna_refresh_token', data.refreshToken)
    setUser(data.user)
    setFamily({ id: data.family.id, name: data.family.name })
    return data
  }

  const logout = async () => {
    try { await api.auth.logout() } catch {}
    clearTokens()
    setUser(null)
    setFamily(null)
  }

  return (
    <AuthContext.Provider value={{ user, family, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
