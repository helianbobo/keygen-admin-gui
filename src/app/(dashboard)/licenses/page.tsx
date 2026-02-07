'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Key, 
  Search, 
  Plus, 
  Loader2, 
  ExternalLink,
  Filter,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'

interface License {
  id: string
  type: 'licenses'
  attributes: {
    key: string
    expiry: string | null
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED'
    uses: number
    maxMachines: number | null
    metadata: Record<string, any>
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
 * LicensesPage - Displays a searchable list of Keygen licenses.
 * Includes functionality to issue new licenses with custom metadata.
 */
export default function LicensesPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const { data, isLoading, error } = useQuery<KeygenListResponse<License>>({
    queryKey: ['licenses', accountId, baseUrl, search],
    queryFn: async () => {
      const url = new URL(`${baseUrl}/accounts/${accountId}/licenses`)
      url.searchParams.set('page[size]', '20')
      if (search) {
        // Keygen API search usually works by key or metadata
        url.searchParams.set('key', search)
      }
      
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch licenses')
      return res.json()
    },
    enabled: !!accountId && !!adminToken,
  })

  const licenses = data?.data || []

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Licenses</h1>
          <p className="text-muted-foreground">Manage and issue software licenses.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Issue License
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by license key..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Error loading licenses. Please check your credentials.
            </div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No licenses found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">License Key</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Expiration</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium truncate max-w-[200px]">
                        {license.attributes.key}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          license.attributes.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {license.attributes.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {license.attributes.expiry 
                          ? formatDate(license.attributes.expiry)
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(license.attributes.created)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/licenses/${license.id}`}>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for license creation - will implement next */}
      {isCreateModalOpen && (
        <CreateLicenseModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={() => {
            setIsCreateModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['licenses'] })
          }}
        />
      )}
    </div>
  )
}

function CreateLicenseModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { accountId, adminToken, baseUrl } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const [senzeBand2Limit, setSenzeBand2Limit] = useState('0')

  // Fetch policies to choose from
  const { data: policiesData, isLoading: loadingPolicies } = useQuery<KeygenListResponse<any>>({
    queryKey: ['policies', accountId, baseUrl],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/policies`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch policies')
      return res.json()
    },
  })

  const policies = policiesData?.data || []

  const issueLicense = async () => {
    if (!selectedPolicyId) {
      toast.error('Please select a policy')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${baseUrl}/accounts/${accountId}/licenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'licenses',
            attributes: {
              metadata: {
                senzeBand2Limit: parseInt(senzeBand2Limit, 10) || 0
              }
            },
            relationships: {
              policy: {
                data: { type: 'policies', id: selectedPolicyId }
              }
            }
          }
        }),
      })

      if (res.ok) {
        toast.success('License issued successfully')
        onSuccess()
      } else {
        const error = await res.json()
        toast.error(error.errors?.[0]?.detail || 'Failed to issue license')
      }
    } catch (err) {
      toast.error('An error occurred during license issuance')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg animate-in zoom-in-95 duration-200">
        <CardHeader>
          <CardTitle>Issue New License</CardTitle>
          <CardDescription>Select a policy and configure metadata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Policy</label>
            {loadingPolicies ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <select 
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
              >
                <option value="">Select a policy...</option>
                {policies.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.attributes.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Senze Band 2 Limit (Metadata)</label>
            <Input 
              type="number" 
              value={senzeBand2Limit}
              onChange={(e) => setSenzeBand2Limit(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">This value will be stored in the license metadata.</p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={issueLicense} disabled={isSubmitting || !selectedPolicyId}>
              {isSubmitting ? 'Issuing...' : 'Issue License'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
