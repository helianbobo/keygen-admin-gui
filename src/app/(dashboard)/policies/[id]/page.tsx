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
import { ArrowLeft, ShieldCheck, Edit, Calendar, Box } from 'lucide-react'
import { PolicyEditDialog } from '@/components/policies/PolicyEditDialog'

// Types for Keygen API responses
interface Product {
  id: string
  type: 'products'
  attributes: {
    name: string
    code: string | null
  }
}

interface Policy {
  id: string
  type: 'policies'
  attributes: {
    name: string
    duration: number | null
    strict: boolean
    floating: boolean
    maxMachines: number | null
    maxProcesses: number | null
    maxUses: number | null
    expirationStrategy: string
    authenticationStrategy: string
    metadata: Record<string, unknown>
    created: string
    updated: string
  }
  relationships: {
    product: {
      data: { type: 'products'; id: string } | null
    }
  }
}

// Expiration strategy labels
const EXPIRATION_STRATEGIES: Record<string, string> = {
  RESTRICT_ACCESS: 'Restrict Access',
  RESET_VALIDATION: 'Reset Validation',
  REVOKE: 'Revoke',
  MAINTAIN_ACCESS: 'Maintain Access',
}

// Authentication strategy labels
const AUTH_STRATEGIES: Record<string, string> = {
  TOKEN: 'Token',
  LICENSE: 'License',
  MIXED: 'Mixed',
  ANONYMOUS: 'Anonymous',
}

/**
 * Converts seconds to a human-readable duration string.
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return 'Lifetime'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []

  if (days > 0) {
    if (days === 365) return '1 year'
    if (days === 30) return '1 month'
    if (days === 7) return '1 week'
    if (days === 14) return '2 weeks'
    if (days === 90) return '3 months'
    parts.push(`${days} day${days !== 1 ? 's' : ''}`)
  }
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (minutes > 0 && days === 0) parts.push(`${minutes} min`)

  return parts.length > 0 ? parts.join(', ') : 'Instant'
}

export default function PolicyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { accountId, adminToken, baseUrl } = useAuth()
  const policyId = params.id as string
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Fetch policy details with included product
  const {
    data: policy,
    isLoading,
    error,
    refetch,
  } = useQuery<Policy>({
    queryKey: ['policy', policyId],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/policies/${policyId}?include=product`,
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
    enabled: !!accountId && !!adminToken && !!policyId,
  })

  // Fetch product details separately if needed
  const { data: productData } = useQuery<{ data: Product }>({
    queryKey: ['policy-product', policy?.relationships?.product?.data?.id],
    queryFn: async () => {
      const productId = policy?.relationships?.product?.data?.id
      if (!productId) return null
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
      return response.json()
    },
    enabled: !!accountId && !!adminToken && !!policy?.relationships?.product?.data?.id,
  })

  const handleEditSuccess = () => {
    refetch()
    toast.success('Policy updated successfully')
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
          <p className="font-medium">Failed to load policy</p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Policy Not Found</h1>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="mt-4 text-lg font-semibold">Policy not found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The policy you are looking for does not exist or has been deleted.
          </p>
          <Button className="mt-4" onClick={() => router.push('/policies')}>
            Back to Policies
          </Button>
        </div>
      </div>
    )
  }

  const { attributes } = policy
  const product = productData?.data
  const productId = policy.relationships?.product?.data?.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/policies')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{attributes.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-muted-foreground">
                {policy.id}
              </code>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Policy Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Policy Information
          </CardTitle>
          <CardDescription>Detailed information about this licensing policy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{attributes.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <Badge variant="secondary" className="mt-1">
                {formatDuration(attributes.duration)}
              </Badge>
              {attributes.duration && (
                <p className="text-xs text-muted-foreground mt-1">
                  {attributes.duration} seconds
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mode</p>
              <div className="flex gap-2 mt-1">
                {attributes.strict && <Badge variant="outline">Strict</Badge>}
                {attributes.floating && <Badge variant="outline">Floating</Badge>}
                {!attributes.strict && !attributes.floating && (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Limits */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Limits</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Max Machines</p>
                <p className="text-lg font-semibold">
                  {attributes.maxMachines !== null ? attributes.maxMachines : '∞'}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Max Processes</p>
                <p className="text-lg font-semibold">
                  {attributes.maxProcesses !== null ? attributes.maxProcesses : '∞'}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Max Uses</p>
                <p className="text-lg font-semibold">
                  {attributes.maxUses !== null ? attributes.maxUses : '∞'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Strategies */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Expiration Strategy</p>
              <Badge variant="outline" className="mt-1">
                {EXPIRATION_STRATEGIES[attributes.expirationStrategy] || attributes.expirationStrategy}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Authentication Strategy</p>
              <Badge variant="outline" className="mt-1">
                {AUTH_STRATEGIES[attributes.authenticationStrategy] || attributes.authenticationStrategy}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Product */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Product</p>
            {product ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Box className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{product.attributes.name}</p>
                  {product.attributes.code && (
                    <code className="text-xs text-muted-foreground">
                      {product.attributes.code}
                    </code>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  View
                </Button>
              </div>
            ) : productId ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Box className="h-4 w-4" />
                <span>Loading product...</span>
              </div>
            ) : (
              <p className="text-muted-foreground">No product associated</p>
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
      <PolicyEditDialog
        policy={policy}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
