'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Package, RefreshCw } from 'lucide-react'
import { ProductDeleteDialog } from '@/components/products/ProductDeleteDialog'

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

interface ProductsResponse {
  data: Product[]
  meta?: {
    count: number
    pages: number
    page: number
  }
}

const DISTRIBUTION_STRATEGIES = [
  { value: 'LICENSED', label: 'Licensed' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
]

const PLATFORM_OPTIONS = [
  'Windows',
  'macOS',
  'Linux',
  'iOS',
  'Android',
  'Web',
]

export default function ProductsPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    distributionStrategy: 'LICENSED',
    platforms: [] as string[],
  })

  // Fetch products
  const {
    data: productsData,
    isLoading,
    error,
    refetch,
  } = useQuery<ProductsResponse>({
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

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/products`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
          },
          body: JSON.stringify({
            data: {
              type: 'products',
              attributes: {
                name: data.name,
                code: data.code || null,
                distributionStrategy: data.distributionStrategy,
                platforms: data.platforms.length > 0 ? data.platforms : null,
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
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsCreateDialogOpen(false)
      resetForm()
      toast.success('Product created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create product: ${error.message}`)
    },
  })

  // Handle successful product deletion
  const handleProductDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    setProductToDelete(null)
    toast.success('Product deleted successfully')
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      distributionStrategy: 'LICENSED',
      platforms: [],
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Product name is required')
      return
    }
    createProduct.mutate(formData)
  }

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }))
  }

  const products = productsData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            Manage your Keygen products and their distribution settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create Product</DialogTitle>
                  <DialogDescription>
                    Add a new product to your Keygen account.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="My Application"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      placeholder="my-app"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, code: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      A unique identifier for the product (optional).
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Distribution Strategy</Label>
                    <Select
                      value={formData.distributionStrategy}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          distributionStrategy: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRIBUTION_STRATEGIES.map((strategy) => (
                          <SelectItem key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Platforms</Label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_OPTIONS.map((platform) => (
                        <Button
                          key={platform}
                          type="button"
                          variant={
                            formData.platforms.includes(platform)
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => togglePlatform(platform)}
                        >
                          {platform}
                        </Button>
                      ))}
                    </div>
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
                  <Button type="submit" disabled={createProduct.isPending}>
                    {createProduct.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading products</p>
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
                <TableHead>Code</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Distribution Strategy</TableHead>
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
                    <Skeleton className="h-5 w-40" />
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
      {!isLoading && !error && products.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first product to get started.
          </p>
          <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Product
          </Button>
        </div>
      )}

      {/* Products Table */}
      {!isLoading && !error && products.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Distribution Strategy</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    {product.attributes.name}
                  </TableCell>
                  <TableCell>
                    {product.attributes.code ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                        {product.attributes.code}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.attributes.platforms &&
                    product.attributes.platforms.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.attributes.platforms.map((platform) => (
                          <Badge key={platform} variant="secondary">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {product.attributes.distributionStrategy}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setProductToDelete(product)}
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
      <AlertDialog
        open={!!productToDelete}
        onOpenChange={() => setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{productToDelete?.attributes.name}&rdquo;?
              This will also delete all associated policies, licenses, and machines.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => productToDelete && deleteProduct.mutate(productToDelete.id)}
            >
              {deleteProduct.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
