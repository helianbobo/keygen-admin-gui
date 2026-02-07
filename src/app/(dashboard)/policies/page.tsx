'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Layers, 
  Plus, 
  Loader2, 
  ExternalLink,
  Package,
  Shield,
  Activity,
  Filter,
  X
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

interface Policy {
  id: string
  type: 'policies'
  attributes: {
    name: string
    duration: number | null
    maxMachines: number | null
    strict: boolean
    floating: boolean
    created: string
  }
  relationships: {
    product: {
      data: { type: 'products', id: string }
    }
  }
}

interface Product {
  id: string
  attributes: {
    name: string
  }
}

interface KeygenListResponse<T> {
  data: T[]
  meta: {
    count: number
  }
}

/**
 * PoliciesPage - Manages licensing policies.
 * Policies define the behavior of licenses (expiry, machine limits, etc.).
 */
export default function PoliciesPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const productIdFilter = searchParams.get('product')
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Fetch all products for filtering and labels
  const { data: productsData } = useQuery<KeygenListResponse<Product>>({
    queryKey: ['products-list', accountId, baseUrl],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/products`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      return res.json()
    },
    enabled: !!accountId && !!adminToken,
  })

  const { data, isLoading, error } = useQuery<KeygenListResponse<Policy>>({
    queryKey: ['policies', accountId, baseUrl, productIdFilter],
    queryFn: async () => {
      const url = new URL(`${baseUrl}/accounts/${accountId}/policies`)
      if (productIdFilter) {
        url.searchParams.set('product', productIdFilter)
      }
      
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch policies')
      return res.json()
    },
    enabled: !!accountId && !!adminToken,
  })

  const policies = data?.data || []
  const products = productsData?.data || []
  const activeProduct = products.find(p => p.id === productIdFilter)

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Perpetual'
    const days = Math.floor(seconds / 86400)
    if (days >= 365) return `${Math.floor(days / 365)} Year(s)`
    if (days >= 30) return `${Math.floor(days / 30)} Month(s)`
    return `${days} Day(s)`
  }

  const clearFilter = () => {
    router.push('/policies')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            Policies
            {activeProduct && (
              <span className="text-sm font-normal bg-orange-50 text-orange-700 px-3 py-1 rounded-full border border-orange-100 flex items-center gap-2">
                <Package className="h-3 w-3" /> {activeProduct.attributes.name}
                <button onClick={clearFilter} className="hover:text-orange-900"><X className="h-3 w-3" /></button>
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Define license behavior, duration, and machine limits.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Create Policy
        </Button>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Error loading policies.
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No policies found for this view.</p>
              <Button variant="link" onClick={() => setIsCreateModalOpen(true)}>Create your first policy</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50/50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500">Policy Name</th>
                    <th className="px-6 py-4 font-medium text-gray-500">Product</th>
                    <th className="px-6 py-4 font-medium text-gray-500">Duration</th>
                    <th className="px-6 py-4 font-medium text-gray-500">Limits</th>
                    <th className="px-6 py-4 font-medium text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {policies.map((policy) => {
                    const policyProduct = products.find(p => p.id === policy.relationships.product.data.id)
                    return (
                      <tr key={policy.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{policy.attributes.name}</span>
                            <span className="text-[10px] font-mono text-gray-400">{policy.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {policyProduct?.attributes.name || 'Unknown Product'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Activity className="h-3.5 w-3.5 text-blue-500" />
                            {formatDuration(policy.attributes.duration)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {policy.attributes.maxMachines ? `${policy.attributes.maxMachines} Machine(s)` : 'Unlimited'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/policies/${policy.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isCreateModalOpen && (
        <CreatePolicyModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={() => {
            setIsCreateModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['policies'] })
          }}
          initialProductId={productIdFilter || ''}
          products={products}
        />
      )}
    </div>
  )
}

function CreatePolicyModal({ 
  onClose, 
  onSuccess, 
  initialProductId, 
  products 
}: { 
  onClose: () => void, 
  onSuccess: () => void,
  initialProductId: string,
  products: Product[]
}) {
  const { accountId, adminToken, baseUrl } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [productId, setProductId] = useState(initialProductId)
  const [maxMachines, setMaxMachines] = useState('1')

  const createPolicy = async () => {
    if (!name || !productId) {
      toast.error('Name and Product are required')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/policies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'policies',
            attributes: {
              name,
              maxMachines: parseInt(maxMachines, 10) || null,
              strict: true
            },
            relationships: {
              product: {
                data: { type: 'products', id: productId }
              }
            }
          }
        }),
      })

      if (res.ok) {
        toast.success('Policy created successfully')
        onSuccess()
      } else {
        const error = await res.json()
        toast.error(error.errors?.[0]?.detail || 'Failed to create policy')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 shadow-2xl border-none">
        <CardHeader>
          <CardTitle>Create Licensing Policy</CardTitle>
          <CardDescription>Rules that govern how licenses for this product behave.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Policy Name</label>
            <Input 
              placeholder="e.g. Professional Plan" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Product</label>
            <select 
              className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.attributes.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Machines</label>
            <Input 
              type="number"
              placeholder="e.g. 1" 
              value={maxMachines}
              onChange={(e) => setMaxMachines(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Leave empty or 0 for unlimited machine activations.</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={createPolicy} disabled={isSubmitting || !name || !productId} className="bg-primary text-white">
              {isSubmitting ? 'Creating...' : 'Create Policy'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
