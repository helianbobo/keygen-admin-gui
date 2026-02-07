'use client'

import { useQuery } from '@tanstack/react-query'
import { 
  Key, 
  Loader2, 
  ChevronLeft,
  Calendar,
  Clock,
  Settings,
  User,
  Package,
  Info
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { useParams } from 'next/navigation'

/**
 * LicenseDetailPage - Shows comprehensive information about a specific license.
 * Fetches data from the Keygen API using the license ID.
 */
export default function LicenseDetailPage() {
  const { id } = useParams()
  const { accountId, adminToken, baseUrl } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['license', id, accountId, baseUrl],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/licenses/${id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch license details')
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
        <p className="text-muted-foreground mt-2">Could not load license details. It may have been deleted.</p>
        <Link href="/licenses" className="mt-4 inline-block">
          <Button variant="outline">Back to Licenses</Button>
        </Link>
      </div>
    )
  }

  const license = data.data
  const attr = license.attributes

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Link href="/licenses" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Licenses
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold font-mono truncate max-w-full">
            {attr.key}
          </h1>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            attr.status === 'ACTIVE' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {attr.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-500" /> License Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Created
                </p>
                <p className="font-medium">{formatDate(attr.created)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Expiration
                </p>
                <p className="font-medium">{formatDate(attr.expiry)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Settings className="h-3 w-3" /> Machines
                </p>
                <p className="font-medium">{attr.uses} / {attr.maxMachines || '∞'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Key className="h-3 w-3" /> ID
                </p>
                <p className="font-mono text-xs">{license.id}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Metadata</h3>
              {Object.keys(attr.metadata).length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {Object.entries(attr.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="font-mono text-muted-foreground">{key}:</span>
                      <span className="font-medium">{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No metadata available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar/Relationships */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" /> Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-1">Associated Policy ID</p>
              <p className="font-mono text-xs truncate">{license.relationships?.policy?.data?.id || 'N/A'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-purple-500" /> Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-1">User ID</p>
              <p className="font-mono text-xs truncate">{license.relationships?.user?.data?.id || 'Anonymous'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
