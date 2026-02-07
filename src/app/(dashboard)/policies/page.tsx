'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, ShieldCheck, RefreshCw } from 'lucide-react'
import { deleteResource } from '@/lib/api'
import { PolicyDeleteDialog } from '@/components/policies/PolicyDeleteDialog'

// Types for Keygen API responses
interface Product {
  id: string
  type: 'products'
  attributes: {
    name: string
    code: string | null
  }
}

interface ProductsResponse {
  data: Product[]
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

interface PoliciesResponse {
  data: Policy[]
  included?: Product[]
  meta?: {
    count: number
    pages: number
    page: number
  }
}

// Duration presets in seconds
const DURATION_PRESETS = [
  { value: '', label: 'Lifetime (no expiration)' },
  { value: '604800', label: '7 days' },
  { value: '1209600', label: '14 days' },
  { value: '2592000', label: '30 days' },
  { value: '7776000', label: '90 days' },
  { value: '31536000', label: '1 year' },
  { value: 'custom', label: 'Custom' },
]

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

export default function PoliciesPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    productId: '',
    durationPreset: '' as string,
    customDuration: '',
    maxMachines: '',
  })

  // Fetch products for the dropdown
  const { data: productsData } = useQuery<ProductsResponse>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/products`,
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
    enabled: !!accountId && !!adminToken,
  })

  // Fetch policies
  const {
    data: policiesData,
    isLoading,
    error,
    refetch,
  } = useQuery<PoliciesResponse>({
    queryKey: ['policies'],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/policies`,
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
    enabled: !!accountId && !!adminToken,
  })

  // Create policy mutation
  const createPolicy = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Calculate duration in seconds
      let duration: number | null = null
      if (data.durationPreset === 'custom' && data.customDuration) {
        duration = parseInt(data.customDuration, 10) * 86400 // Convert days to seconds
      } else if (data.durationPreset && data.durationPreset !== '') {
        duration = parseInt(data.durationPreset, 10)
      }

      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/policies`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
          },
          body: JSON.stringify({
            data: {
              type: 'policies',
              attributes: {
                name: data.name,
                duration: duration,
                maxMachines: data.maxMachines ? parseInt(data.maxMachines, 10) : null,
              },
              relationships: {
                product: {
                  data: { type: 'products', id: data.productId },
                },
              },
            },
          }),
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.errors?.[0]?.detail || `Error: ${response.status}`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      setIsCreateDialogOpen(false)
      resetForm()
      toast.success('Policy created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create policy: ${error.message}`)
    },
  })

  // Delete policy mutation
  const deletePolicy = useMutation({
    mutationFn: (policyId: string) => deleteResource('policies', policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      setPolicyToDelete(null)
      toast.success('Policy deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete policy: ${error.message}`)
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      productId: '',
      durationPreset: '',
      customDuration: '',
      maxMachines: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Policy name is required')
      return
    }
    if (!formData.productId) {
      toast.error('Product is required')
      return
    }
    createPolicy.mutate(formData)
  }

  // Map product IDs to names for display
  const productMap = new Map(
    productsData?.data?.map((p) => [p.id, p.attributes.name]) || []
  )

  const getProductName = (productId: string | null | undefined): string => {
    if (!productId) return '—'
    return productMap.get(productId) || productId
  }

  const policies = policiesData?.data || []
  const products = productsData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Policies</h2>
          <p className="text-muted-foreground">
            Define licensing rules and constraints for your products.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={products.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Create Policy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create Policy</DialogTitle>
                  <DialogDescription>
                    Define a new licensing policy for a product.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Pro License"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Product *</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, productId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.attributes.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Duration</Label>
                    <Select
                      value={formData.durationPreset}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          durationPreset: value,
                          customDuration: value !== 'custom' ? '' : prev.customDuration,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.durationPreset === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Number of days"
                          value={formData.customDuration}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              customDuration: e.target.value,
                            }))
                          }
                          min="1"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxMachines">Max Machines</Label>
                    <Input
                      id="maxMachines"
                      type="number"
                      placeholder="Unlimited"
                      value={formData.maxMachines}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          maxMachines: e.target.value,
                        }))
                      }
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for unlimited machine activations.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPolicy.isPending}>
                    {createPolicy.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Warning if no products */}
      {!isLoading && products.length === 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <p className="font-medium">No products available</p>
          <p className="text-sm">
            You need to create at least one product before you can create policies.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading policies</p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max Machines</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && policies.length === 0 && products.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No policies yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first policy to define licensing rules.
          </p>
          <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Policy
          </Button>
        </div>
      )}

      {/* Policies Table */}
      {!isLoading && !error && policies.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max Machines</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">
                    {policy.attributes.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {formatDuration(policy.attributes.duration)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {policy.attributes.maxMachines !== null ? (
                      <span>{policy.attributes.maxMachines}</span>
                    ) : (
                      <span className="text-muted-foreground">Unlimited</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getProductName(policy.relationships?.product?.data?.id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setPolicyToDelete(policy)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <PolicyDeleteDialog
        policy={policyToDelete}
        isOpen={!!policyToDelete}
        onClose={() => setPolicyToDelete(null)}
        onConfirm={() => policyToDelete && deletePolicy.mutate(policyToDelete.id)}
        isLoading={deletePolicy.isPending}
      />
    </div>
  )
}
