'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ArrowLeft, ExternalLink, Package, Edit, Calendar, Globe } from 'lucide-react'
import { ProductEditDialog } from '@/components/products/ProductEditDialog'

// Types for Keygen API responses
interface Product {
  id: string
  type: 'products'
  attributes: {
    name: string
    code: string | null
    distributionStrategy: string
    url: string | null
    platforms: string[]
    permissions: string[]
    metadata: Record<string, unknown>
    created: string
    updated: string
  }
}

const DISTRIBUTION_STRATEGIES: Record<string, string> = {
  LICENSED: 'Licensed',
  OPEN: 'Open',
  CLOSED: 'Closed',
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { accountId, adminToken, baseUrl } = useAuth()
  const productId = params.id as string
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Fetch product details
  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useQuery<Product>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/products/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Accept: 'application/vnd.api+json',
          },
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.errors?.[0]?.detail || `Error: ${response.status}`)
      }
      return response.json().then((res) => res.data)
    },
    enabled: !!accountId && !!adminToken && !!productId,
  })

  const handleEditSuccess = () => {
    refetch()
    toast.success('Product updated successfully')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Error</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Failed to load product</p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Product Not Found</h1>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="mt-4 text-lg font-semibold">Product not found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The product you are looking for does not exist or has been deleted.
          </p>
          <Button className="mt-4" onClick={() => router.push('/products')}>
            Back to Products
          </Button>
        </div>
      </div>
    )
  }

  const { attributes } = product

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{attributes.name}</h1>
            {attributes.code && (
              <p className="text-muted-foreground">
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                  {attributes.code}
                </code>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Product Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Information
          </CardTitle>
          <CardDescription>Detailed information about this product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{attributes.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="font-medium">
                {attributes.code ? (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                    {attributes.code}
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
          </div>

          <Separator />

          {/* Distribution & URL */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Distribution Strategy</p>
              <Badge variant="outline" className="mt-1">
                {DISTRIBUTION_STRATEGIES[attributes.distributionStrategy] || attributes.distributionStrategy}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">URL</p>
              {attributes.url ? (
                <a
                  href={attributes.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                >
                  <Globe className="h-3 w-3" />
                  {attributes.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-muted-foreground mt-1">—</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Platforms */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Platforms</p>
            {attributes.platforms && attributes.platforms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attributes.platforms.map((platform) => (
                  <Badge key={platform} variant="secondary">
                    {platform}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>

          <Separator />

          {/* Permissions */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Permissions</p>
            {attributes.permissions && attributes.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attributes.permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>

          <Separator />

          {/* Metadata */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Metadata</p>
            {attributes.metadata && Object.keys(attributes.metadata).length > 0 ? (
              <pre className="rounded-md bg-muted p-3 text-sm overflow-x-auto">
                {JSON.stringify(attributes.metadata, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">
                  {new Date(attributes.created).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-sm">
                  {new Date(attributes.updated).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ProductEditDialog
        product={product}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
