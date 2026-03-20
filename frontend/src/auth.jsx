import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { auth as authApi } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      setUser(await authApi.me())
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(username, password) {
    const u = await authApi.login({ username, password })
    setUser(u)
    return u
  }

  async function register({ username, email, password }) {
    const u = await authApi.register({ username, email: email || null, password })
    setUser(u)
    return u
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

