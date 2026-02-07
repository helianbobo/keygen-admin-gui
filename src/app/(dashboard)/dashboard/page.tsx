'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Key, 
  Monitor, 
  Package,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

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

interface Policy {
  id: string
  type: 'policies'
  attributes: {
    name: string
  }
}

interface License {
  id: string
  type: 'licenses'
  attributes: {
    key: string
    name: string | null
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'BANNED'
    created: string
  }
  relationships: {
    policy: {
      data: { type: 'policies'; id: string } | null
    }
  }
}

interface LicensesResponse {
  data: License[]
  included?: Policy[]
}

// Status badge variants
const STATUS_VARIANTS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ACTIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-500/80' },
  INACTIVE: { variant: 'secondary', className: 'bg-gray-400 hover:bg-gray-400/80 text-white' },
  EXPIRED: { variant: 'destructive' },
  SUSPENDED: { variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-500/80 text-black' },
  BANNED: { variant: 'destructive' },
}

/**
 * Truncates a license key for display, showing first and last characters.
 */
function truncateKey(key: string, showChars: number = 6): string {
  if (key.length <= showChars * 2 + 3) return key
  return `${key.slice(0, showChars)}...${key.slice(-showChars)}`
}

/**
 * Formats a timestamp as relative time (e.g., "2 hours ago").
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export default function DashboardPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const router = useRouter()

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

  // Fetch recent licenses (latest 5)
  const { data: recentLicensesData, isLoading: loadingRecentLicenses } = useQuery<LicensesResponse>({
    queryKey: ['recent-licenses', accountId, baseUrl],
    queryFn: async () => {
      const res = await fetch(
        `${baseUrl}/accounts/${accountId}/licenses?page[size]=5&sort=-created&include=policy`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Accept': 'application/vnd.api+json',
          },
        }
      )
      if (!res.ok) throw new Error('Failed to fetch recent licenses')
      return res.json()
    },
    enabled: !!accountId && !!adminToken,
  })

  const recentLicenses = recentLicensesData?.data || []
  
  // Build policy map from included data
  const policyMap = new Map(
    recentLicensesData?.included
      ?.filter((item): item is Policy => item.type === 'policies')
      .map((p) => [p.id, p.attributes.name]) || []
  )

  const getPolicyName = (policyId: string | null | undefined): string => {
    if (!policyId) return '—'
    return policyMap.get(policyId) || 'Unknown'
  }

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
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">Snapshot of your Keygen environment.</p>
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

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        {/* Recent Licenses Card */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Recent Licenses
            </CardTitle>
            <Link 
              href="/licenses"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingRecentLicenses ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentLicenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Key className="h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No licenses yet</p>
                <Link 
                  href="/licenses"
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Create your first license
                </Link>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Policy</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLicenses.map((license) => {
                      const statusStyle = STATUS_VARIANTS[license.attributes.status] || { variant: 'secondary' as const }
                      return (
                        <TableRow
                          key={license.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/licenses/${license.id}`)}
                        >
                          <TableCell>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                              {truncateKey(license.attributes.key)}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusStyle.variant}
                              className={statusStyle.className}
                            >
                              {license.attributes.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {getPolicyName(license.relationships?.policy?.data?.id)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm text-muted-foreground">
                              {formatRelativeTime(license.attributes.created)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Info Card */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Account</p>
              <p className="text-sm text-muted-foreground font-mono">{accountId}</p>
            </div>
            <div>
              <p className="text-sm font-medium">API Endpoint</p>
              <p className="text-sm text-muted-foreground font-mono break-all">{baseUrl}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
