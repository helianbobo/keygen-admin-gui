'use client'

import { useQuery } from '@tanstack/react-query'
import { 
  Shield, 
  Loader2, 
  ChevronLeft,
  Calendar,
  Package,
  Info,
  Activity,
  Lock
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useParams } from 'next/navigation'

/**
 * PolicyDetailPage - Shows details for a specific licensing policy.
 */
export default function PolicyDetailPage() {
  const { id } = useParams()
  const { accountId, adminToken, baseUrl } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['policy', id, accountId, baseUrl],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/policies/${id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch policy details')
      return res.json()
    },
    enabled: !!accountId && !!adminToken && !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Error</h2>
        <p className="text-muted-foreground mt-2">Could not load policy details.</p>
        <Link href="/policies" className="mt-4 inline-block">
          <Button variant="outline">Back to Policies</Button>
        </Link>
      </div>
    )
  }

  const policy = data.data
  const attr = policy.attributes

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Perpetual'
    const days = Math.floor(seconds / 86400)
    return `${days} Day(s)`
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Link href="/policies" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Policies
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-500" />
            {attr.name}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-500" /> Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Duration
                </p>
                <p className="font-medium">{formatDuration(attr.duration)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Created
                </p>
                <p className="font-medium">{formatDate(attr.created)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Machine Limit
                </p>
                <p className="font-medium">{attr.maxMachines || 'Unlimited'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> ID
                </p>
                <p className="font-mono text-xs">{policy.id}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Flags</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${attr.strict ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium">Strict Validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${attr.floating ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium">Floating Licenses</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Relationships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                <Package className="h-3 w-3" /> Product ID
              </p>
              <p className="font-mono text-[10px] break-all">{policy.relationships?.product?.data?.id || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
