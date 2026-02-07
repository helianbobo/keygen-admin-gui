'use client'

import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Key, 
  Monitor, 
  Package,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="space-y-6">
      <div>
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
              Use the sidebar to navigate through your products, policies, and licenses.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
