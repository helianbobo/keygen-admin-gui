'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Package, 
  Plus, 
  Loader2, 
  ExternalLink,
  Layers
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'

interface Product {
  id: string
  type: 'products'
  attributes: {
    name: string
    code: string
    platforms: string[]
    created: string
  }
}

interface KeygenListResponse<T> {
  data: T[]
  meta: {
    count: number
  }
}

/**
 * ProductsPage - Manages software products.
 * Essential for the Product -> Policy -> License dependency chain.
 */
export default function ProductsPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const { data, isLoading, error } = useQuery<KeygenListResponse<Product>>({
    queryKey: ['products', accountId, baseUrl],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/products`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch products')
      return res.json()
    },
    enabled: !!accountId && !!adminToken,
  })

  const products = data?.data || []

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-muted-foreground">Manage software products and their distribution strategies.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Error loading products.
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No products found. Start by creating your first product.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500">Name</th>
                    <th className="px-6 py-4 font-medium text-gray-500">Code</th>
                    <th className="px-6 py-4 font-medium text-gray-500">Platforms</th>
                    <th className="px-6 py-4 font-medium text-gray-500">Created</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-50 rounded-lg">
                            <Package className="h-4 w-4 text-orange-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{product.attributes.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        {product.attributes.code}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {product.attributes.platforms?.length > 0 ? (
                            product.attributes.platforms.map(p => (
                              <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium uppercase tracking-wider">
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs italic">No platforms</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(product.attributes.created)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/policies?product=${product.id}`}>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5">
                              <Layers className="h-3.5 w-3.5" /> Policies
                            </Button>
                          </Link>
                          <Link href={`/products/${product.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isCreateModalOpen && (
        <CreateProductModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={() => {
            setIsCreateModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}
    </div>
  )
}

function CreateProductModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { accountId, adminToken, baseUrl } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const createProduct = async () => {
    if (!name || !code) {
      toast.error('Name and Code are required')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'products',
            attributes: {
              name,
              code,
              distributionStrategy: 'LICENSED'
            }
          }
        }),
      })

      if (res.ok) {
        toast.success('Product created successfully')
        onSuccess()
      } else {
        const error = await res.json()
        toast.error(error.errors?.[0]?.detail || 'Failed to create product')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md animate-in zoom-in-95 duration-200 shadow-2xl">
        <CardHeader>
          <CardTitle>Create Product</CardTitle>
          <CardDescription>Add a new software product to manage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Name</label>
            <Input 
              placeholder="e.g. Acme Studio" 
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!code) setCode(e.target.value.toLowerCase().replace(/\s+/g, '-'))
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Code</label>
            <Input 
              placeholder="e.g. acme-studio" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Unique identifier used in URLs and API calls.</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={createProduct} disabled={isSubmitting || !name || !code}>
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
