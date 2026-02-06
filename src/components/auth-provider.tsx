'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  accountId: string | null
  adminToken: string | null
  login: (accountId: string, adminToken: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const savedAccount = localStorage.getItem('keygen_account_id')
    const savedToken = localStorage.getItem('keygen_admin_token')

    if (savedAccount && savedToken) {
      setAccountId(savedAccount)
      setAdminToken(savedToken)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!loading) {
      if (!adminToken && pathname !== '/login') {
        router.push('/login')
      } else if (adminToken && pathname === '/login') {
        router.push('/')
      }
    }
  }, [adminToken, pathname, loading, router])

  const login = (accId: string, token: string) => {
    localStorage.setItem('keygen_account_id', accId)
    localStorage.setItem('keygen_admin_token', token)
    setAccountId(accId)
    setAdminToken(token)
    router.push('/')
  }

  const logout = () => {
    localStorage.removeItem('keygen_account_id')
    localStorage.removeItem('keygen_admin_token')
    setAccountId(null)
    setAdminToken(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        accountId,
        adminToken,
        login,
        logout,
        isAuthenticated: !!adminToken,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
