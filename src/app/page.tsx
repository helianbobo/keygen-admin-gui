'use client'

import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Key, 
  Monitor, 
  Package,
  Loader2,
  LogOut,
  ShieldCheck
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface KeygenResponse {
  meta?: {
    count?: number
    total?: number
  }
  links?: {
    meta?: {
      count?: number
    }
  }
}

export default function DashboardPage() {
  const { accountId, adminToken, baseUrl, logout } = useAuth()

  const fetchMetric = async (resource: string) => {
    const res = await fetch(`${baseUrl}/accounts/${accountId}/${resource}?page[size]=1&page[number]=1`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Accept': 'application/vnd.api+json',
      },
    })
    if (!res.ok) throw new Error(`Failed to fetch ${resource}`)
    const data: KeygenResponse = await res.json()
    
    // Keygen API provides the total count in meta.count or links.meta.count
    return data.meta?.count ?? data.meta?.total ?? data.links?.meta?.count ?? 0
  }

  const { data: licenses, isLoading: loadingLicenses } = useQuery({
    queryKey: ['licenses', accountId, baseUrl],
    queryFn: () => fetchMetric('licenses'),
    enabled: !!accountId && !!adminToken,
  })

  const { data: machines, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines', accountId, baseUrl],
    queryFn: () => fetchMetric('machines'),
    enabled: !!accountId && !!adminToken,
  })

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', accountId, baseUrl],
    queryFn: () => fetchMetric('users'),
    enabled: !!accountId && !!adminToken,
  })

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', accountId, baseUrl],
    queryFn: () => fetchMetric('products'),
    enabled: !!accountId && !!adminToken,
  })

  const metrics = [
    {
      title: 'Total Licenses',
      value: licenses,
      loading: loadingLicenses,
      icon: Key,
      color: 'text-blue-600',
    },
    {
      title: 'Active Machines',
      value: machines,
      loading: loadingMachines,
      icon: Monitor,
      color: 'text-green-600',
    },
    {
      title: 'Total Users',
      value: users,
      loading: loadingUsers,
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Products',
      value: products,
      loading: loadingProducts,
      icon: Package,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>Keygen Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">Account: {accountId}</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {baseUrl}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your licensing system.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                {metric.loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{metric.value?.toLocaleString() ?? 0}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Keygen Admin GUI</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This dashboard provides a real-time overview of your Keygen resources. 
                Use the metrics above to track your system's health and usage.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
