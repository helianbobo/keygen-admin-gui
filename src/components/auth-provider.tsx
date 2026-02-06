'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  accountId: string | null
  adminToken: string | null
  baseUrl: string
  login: (accountId: string, adminToken: string, baseUrl: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_BASE_URL = 'https://api.keygen.sh/v1'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(null)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_BASE_URL)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const savedAccount = localStorage.getItem('keygen_account_id')
    const savedToken = localStorage.getItem('keygen_admin_token')
    const savedBaseUrl = localStorage.getItem('keygen_base_url')

    if (savedAccount && savedToken) {
      setAccountId(savedAccount)
      setAdminToken(savedToken)
      if (savedBaseUrl) {
        setBaseUrl(savedBaseUrl)
      }
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

  const login = (accId: string, token: string, url: string) => {
    localStorage.setItem('keygen_account_id', accId)
    localStorage.setItem('keygen_admin_token', token)
    localStorage.setItem('keygen_base_url', url)
    setAccountId(accId)
    setAdminToken(token)
    setBaseUrl(url)
    router.push('/')
  }

  const logout = () => {
    localStorage.removeItem('keygen_account_id')
    localStorage.removeItem('keygen_admin_token')
    localStorage.removeItem('keygen_base_url')
    setAccountId(null)
    setAdminToken(null)
    setBaseUrl(DEFAULT_BASE_URL)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        accountId,
        adminToken,
        baseUrl,
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
