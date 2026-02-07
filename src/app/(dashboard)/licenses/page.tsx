'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
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
import { Plus, Key, RefreshCw, Copy, Check, Eye } from 'lucide-react'

// Types for Keygen API responses
interface Policy {
  id: string
  type: 'policies'
  attributes: {
    name: string
  }
}

interface User {
  id: string
  type: 'users'
  attributes: {
    email: string
    firstName: string | null
    lastName: string | null
  }
}

interface License {
  id: string
  type: 'licenses'
  attributes: {
    key: string
    name: string | null
    expiry: string | null
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'BANNED'
    uses: number
    maxMachines: number | null
    maxProcesses: number | null
    maxUses: number | null
    protected: boolean
    suspended: boolean
    metadata: Record<string, unknown>
    created: string
    updated: string
  }
  relationships: {
    policy: {
      data: { type: 'policies'; id: string } | null
    }
    user: {
      data: { type: 'users'; id: string } | null
    }
  }
}

interface LicensesResponse {
  data: License[]
  meta?: {
    count: number
    pages: number
    page: number
  }
}

interface PoliciesResponse {
  data: Policy[]
}

interface UsersResponse {
  data: User[]
}

interface CreateLicenseResponse {
  data: License
}

// Status badge variants
const STATUS_VARIANTS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ACTIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-500/80' },
  INACTIVE: { variant: 'secondary', className: 'bg-gray-400 hover:bg-gray-400/80 text-white' },
  EXPIRED: { variant: 'destructive' },
  SUSPENDED: { variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-500/80 text-black' },
  BANNED: { variant: 'destructive' },
}

/**
 * Truncates a license key for display, showing first and last characters.
 */
function truncateKey(key: string, showChars: number = 8): string {
  if (key.length <= showChars * 2 + 3) return key
  return `${key.slice(0, showChars)}...${key.slice(-showChars)}`
}

/**
 * Formats an expiry date in a human-readable format.
 */
function formatExpiry(expiry: string | null): string {
  if (!expiry) return 'Never'
  const date = new Date(expiry)
  const now = new Date()
  
  if (date < now) {
    return `Expired ${date.toLocaleDateString()}`
  }
  
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function LicensesPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createdLicenseKey, setCreatedLicenseKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Form state
  const [formData, setFormData] = useState({
    policyId: '',
    userId: '',
    expiry: '',
    name: '',
  })

  // Fetch policies for the dropdown
  const { data: policiesData } = useQuery<PoliciesResponse>({
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

  // Fetch users for the dropdown
  const { data: usersData } = useQuery<UsersResponse>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/users`,
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

  // Fetch licenses
  const {
    data: licensesData,
    isLoading,
    error,
    refetch,
  } = useQuery<LicensesResponse>({
    queryKey: ['licenses', statusFilter],
    queryFn: async () => {
      let url = `${baseUrl}/accounts/${accountId}/licenses?limit=100`
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Accept: 'application/vnd.api+json',
        },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.errors?.[0]?.detail || `Error: ${response.status}`)
      }
      return response.json()
    },
    enabled: !!accountId && !!adminToken,
  })

  // Create license mutation
  const createLicense = useMutation({
    mutationFn: async (data: typeof formData): Promise<CreateLicenseResponse> => {
      const payload: {
        data: {
          type: 'licenses'
          attributes: {
            expiry?: string
            name?: string
          }
          relationships: {
            policy: { data: { type: 'policies'; id: string } }
            user?: { data: { type: 'users'; id: string } }
          }
        }
      } = {
        data: {
          type: 'licenses',
          attributes: {},
          relationships: {
            policy: { data: { type: 'policies', id: data.policyId } },
          },
        },
      }

      // Add optional attributes
      if (data.expiry) {
        payload.data.attributes.expiry = new Date(data.expiry).toISOString()
      }
      if (data.name) {
        payload.data.attributes.name = data.name
      }
      if (data.userId) {
        payload.data.relationships.user = {
          data: { type: 'users', id: data.userId },
        }
      }

      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/licenses`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
          },
          body: JSON.stringify(payload),
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.errors?.[0]?.detail || `Error: ${response.status}`)
      }
      return response.json()
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] })
      setCreatedLicenseKey(response.data.attributes.key)
      resetForm()
      toast.success('License created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create license: ${error.message}`)
    },
  })

  const resetForm = () => {
    setFormData({
      policyId: '',
      userId: '',
      expiry: '',
      name: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.policyId) {
      toast.error('Policy is required')
      return
    }
    createLicense.mutate(formData)
  }

  const copyToClipboard = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(key)
      toast.success('License key copied to clipboard')
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setCreatedLicenseKey(null)
    resetForm()
  }

  // Map policy IDs to names for display
  const policyMap = new Map(
    policiesData?.data?.map((p) => [p.id, p.attributes.name]) || []
  )

  // Map user IDs to display names
  const userMap = new Map(
    usersData?.data?.map((u) => [
      u.id,
      u.attributes.firstName && u.attributes.lastName
        ? `${u.attributes.firstName} ${u.attributes.lastName}`
        : u.attributes.email,
    ]) || []
  )

  const getPolicyName = (policyId: string | null | undefined): string => {
    if (!policyId) return '—'
    return policyMap.get(policyId) || 'Unknown'
  }

  const getUserName = (userId: string | null | undefined): string => {
    if (!userId) return '—'
    return userMap.get(userId) || 'Unknown'
  }

  const licenses = licensesData?.data || []
  const policies = policiesData?.data || []
  const users = usersData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Licenses</h2>
          <p className="text-muted-foreground">
            Manage your customer licenses and their status.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="BANNED">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (!open) handleCloseCreateDialog()
            else setIsCreateDialogOpen(true)
          }}>
            <DialogTrigger asChild>
              <Button disabled={policies.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Create License
              </Button>
            </DialogTrigger>
            <DialogContent>
              {createdLicenseKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>License Created Successfully</DialogTitle>
                    <DialogDescription>
                      Copy the license key below. This is the only time you&apos;ll see the full key.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label>License Key</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 rounded-md bg-muted p-3 text-sm font-mono break-all">
                        {createdLicenseKey}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(createdLicenseKey)}
                      >
                        {copiedKey === createdLicenseKey ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseCreateDialog}>Done</Button>
                  </DialogFooter>
                </>
              ) : (
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Create License</DialogTitle>
                    <DialogDescription>
                      Generate a new license key for a customer.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Policy *</Label>
                      <Select
                        value={formData.policyId}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, policyId: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a policy" />
                        </SelectTrigger>
                        <SelectContent>
                          {policies.map((policy) => (
                            <SelectItem key={policy.id} value={policy.id}>
                              {policy.attributes.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        The policy defines the license rules and constraints.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label>User (Optional)</Label>
                      <Select
                        value={formData.userId}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            userId: value === 'none' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No user assigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No user assigned</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.attributes.firstName && user.attributes.lastName
                                ? `${user.attributes.firstName} ${user.attributes.lastName} (${user.attributes.email})`
                                : user.attributes.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name (Optional)</Label>
                      <Input
                        id="name"
                        placeholder="Customer name or reference"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="expiry">Expiry Date (Optional)</Label>
                      <Input
                        id="expiry"
                        type="date"
                        value={formData.expiry}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, expiry: e.target.value }))
                        }
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use the policy&apos;s default duration.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseCreateDialog}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLicense.isPending}>
                      {createLicense.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Warning if no policies */}
      {!isLoading && policies.length === 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <p className="font-medium">No policies available</p>
          <p className="text-sm">
            You need to create at least one policy before you can create licenses.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading licenses</p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
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
      {!isLoading && !error && licenses.length === 0 && policies.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Key className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No licenses yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusFilter !== 'ALL'
              ? `No licenses with status "${statusFilter}" found.`
              : 'Create your first license to get started.'}
          </p>
          {statusFilter === 'ALL' && (
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create License
            </Button>
          )}
        </div>
      )}

      {/* Licenses Table */}
      {!isLoading && !error && licenses.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((license) => {
                const statusStyle = STATUS_VARIANTS[license.attributes.status] || { variant: 'secondary' as const }
                return (
                  <TableRow
                    key={license.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/licenses/${license.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                          {truncateKey(license.attributes.key)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(license.attributes.key)
                          }}
                        >
                          {copiedKey === license.attributes.key ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusStyle.variant}
                        className={statusStyle.className}
                      >
                        {license.attributes.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatExpiry(license.attributes.expiry)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPolicyName(license.relationships?.policy?.data?.id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getUserName(license.relationships?.user?.data?.id)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/licenses/${license.id}`)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
