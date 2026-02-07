'use client'

import { useQuery } from '@tanstack/react-query'
import { 
  Package, 
  Loader2, 
  ChevronLeft,
  Calendar,
  Layers,
  Info,
  Code,
  Globe
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useParams } from 'next/navigation'

/**
 * ProductDetailPage - Shows details for a specific product.
 */
export default function ProductDetailPage() {
  const { id } = useParams()
  const { accountId, adminToken, baseUrl } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', id, accountId, baseUrl],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch product details')
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
        <p className="text-muted-foreground mt-2">Could not load product details.</p>
        <Link href="/products" className="mt-4 inline-block">
          <Button variant="outline">Back to Products</Button>
        </Link>
      </div>
    )
  }

  const product = data.data
  const attr = product.attributes

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Link href="/products" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Products
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8 text-orange-500" />
            {attr.name}
          </h1>
          <div className="flex gap-2">
            <Link href={`/policies?product=${product.id}`}>
              <Button variant="outline" className="gap-2">
                <Layers className="h-4 w-4" /> View Policies
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-500" /> Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Code className="h-3 w-3" /> Product Code
                </p>
                <p className="font-mono">{attr.code}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Created
                </p>
                <p className="font-medium">{formatDate(attr.created)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Platforms
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {attr.platforms?.map((p: string) => (
                    <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium uppercase">
                      {p}
                    </span>
                  )) || <span className="text-sm italic">None</span>}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> ID
                </p>
                <p className="font-mono text-xs">{product.id}</p>
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
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Distribution</p>
              <p className="text-sm font-medium">{attr.distributionStrategy || 'LICENSED'}</p>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Additional metrics and management options will be available in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
