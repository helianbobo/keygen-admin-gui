'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { toast } from 'sonner'
import {
  ArrowLeft,
  Copy,
  Check,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  XCircle,
  Trash2,
  Monitor,
  Calendar,
  Key,
  Shield,
  User,
  Hash,
} from 'lucide-react'

// Types
interface Policy {
  id: string
  type: 'policies'
  attributes: {
    name: string
    maxMachines: number | null
    duration: number | null
  }
}

interface UserData {
  id: string
  type: 'users'
  attributes: {
    email: string
    firstName: string | null
    lastName: string | null
  }
}

interface Machine {
  id: string
  type: 'machines'
  attributes: {
    fingerprint: string
    name: string | null
    platform: string | null
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

interface LicenseResponse {
  data: License
  included?: (Policy | UserData)[]
}

interface MachinesResponse {
  data: Machine[]
  meta?: {
    count: number
  }
}

type ActionType = 'suspend' | 'reinstate' | 'renew' | 'revoke' | 'delete'

// Status badge variants
const STATUS_VARIANTS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ACTIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-500/80' },
  INACTIVE: { variant: 'secondary', className: 'bg-gray-400 hover:bg-gray-400/80 text-white' },
  EXPIRED: { variant: 'destructive' },
  SUSPENDED: { variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-500/80 text-black' },
  BANNED: { variant: 'destructive' },
}

/**
 * Formats a date for display.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats expiry with relative indicator.
 */
function formatExpiry(expiry: string | null): { text: string; isExpired: boolean } {
  if (!expiry) return { text: 'Never expires', isExpired: false }
  const date = new Date(expiry)
  const now = new Date()
  const isExpired = date < now

  const formatted = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (isExpired) {
    return { text: `Expired on ${formatted}`, isExpired: true }
  }

  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 7) {
    return { text: `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''} (${formatted})`, isExpired: false }
  }

  return { text: `Expires on ${formatted}`, isExpired: false }
}

export default function LicenseDetailsPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const params = useParams()
  const licenseId = params.id as string

  const [copiedKey, setCopiedKey] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null)

  // Fetch license details
  const {
    data: licenseData,
    isLoading,
    error,
    refetch,
  } = useQuery<LicenseResponse>({
    queryKey: ['license', licenseId],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/licenses/${licenseId}`,
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
    enabled: !!accountId && !!adminToken && !!licenseId,
  })

  // Fetch machines for this license
  const { data: machinesData } = useQuery<MachinesResponse>({
    queryKey: ['license-machines', licenseId],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/licenses/${licenseId}/machines`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Accept: 'application/vnd.api+json',
          },
        }
      )
      if (!response.ok) {
        // If no machines endpoint exists, return empty
        return { data: [] }
      }
      return response.json()
    },
    enabled: !!accountId && !!adminToken && !!licenseId,
  })

  // Fetch policy details
  const { data: policyData } = useQuery({
    queryKey: ['policy', licenseData?.data?.relationships?.policy?.data?.id],
    queryFn: async () => {
      const policyId = licenseData?.data?.relationships?.policy?.data?.id
      if (!policyId) return null
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/policies/${policyId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Accept: 'application/vnd.api+json',
          },
        }
      )
      if (!response.ok) return null
      return response.json()
    },
    enabled: !!accountId && !!adminToken && !!licenseData?.data?.relationships?.policy?.data?.id,
  })

  // Fetch user details
  const { data: userData } = useQuery({
    queryKey: ['user', licenseData?.data?.relationships?.user?.data?.id],
    queryFn: async () => {
      const userId = licenseData?.data?.relationships?.user?.data?.id
      if (!userId) return null
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Accept: 'application/vnd.api+json',
          },
        }
      )
      if (!response.ok) return null
      return response.json()
    },
    enabled: !!accountId && !!adminToken && !!licenseData?.data?.relationships?.user?.data?.id,
  })

  // Action mutations
  const performAction = useMutation({
    mutationFn: async (action: ActionType) => {
      let url: string
      let method: string = 'POST'

      switch (action) {
        case 'suspend':
          url = `${baseUrl}/accounts/${accountId}/licenses/${licenseId}/actions/suspend`
          break
        case 'reinstate':
          url = `${baseUrl}/accounts/${accountId}/licenses/${licenseId}/actions/reinstate`
          break
        case 'renew':
          url = `${baseUrl}/accounts/${accountId}/licenses/${licenseId}/actions/renew`
          break
        case 'revoke':
          url = `${baseUrl}/accounts/${accountId}/licenses/${licenseId}/actions/revoke`
          break
        case 'delete':
          url = `${baseUrl}/accounts/${accountId}/licenses/${licenseId}`
          method = 'DELETE'
          break
        default:
          throw new Error('Unknown action')
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Accept: 'application/vnd.api+json',
        },
      })

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.errors?.[0]?.detail || `Error: ${response.status}`)
      }

      return action
    },
    onSuccess: (action) => {
      setConfirmAction(null)
      queryClient.invalidateQueries({ queryKey: ['license', licenseId] })
      queryClient.invalidateQueries({ queryKey: ['licenses'] })

      const messages: Record<ActionType, string> = {
        suspend: 'License suspended successfully',
        reinstate: 'License reinstated successfully',
        renew: 'License renewed successfully',
        revoke: 'License revoked successfully',
        delete: 'License deleted successfully',
      }

      toast.success(messages[action])

      if (action === 'delete' || action === 'revoke') {
        router.push('/licenses')
      } else {
        refetch()
      }
    },
    onError: (error: Error) => {
      setConfirmAction(null)
      toast.error(`Action failed: ${error.message}`)
    },
  })

  const copyToClipboard = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(true)
      toast.success('License key copied to clipboard')
      setTimeout(() => setCopiedKey(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const license = licenseData?.data
  const policy = policyData?.data as Policy | undefined
  const user = userData?.data as UserData | undefined
  const machines = machinesData?.data || []
  const machineCount = machines.length

  const statusStyle = license ? STATUS_VARIANTS[license.attributes.status] || { variant: 'secondary' as const } : { variant: 'secondary' as const }
  const expiryInfo = license ? formatExpiry(license.attributes.expiry) : { text: '', isExpired: false }

  // Determine which actions are available based on status
  const canSuspend = license?.attributes.status === 'ACTIVE'
  const canReinstate = license?.attributes.status === 'SUSPENDED'
  const canRenew = license?.attributes.status === 'ACTIVE' || license?.attributes.status === 'EXPIRED'
  const canRevoke = license?.attributes.status !== 'BANNED'

  const getActionConfig = (action: ActionType) => {
    const configs: Record<ActionType, { title: string; description: string; buttonText: string; destructive: boolean }> = {
      suspend: {
        title: 'Suspend License',
        description: 'Are you sure you want to suspend this license? The license will become inactive until reinstated.',
        buttonText: 'Suspend',
        destructive: false,
      },
      reinstate: {
        title: 'Reinstate License',
        description: 'Are you sure you want to reinstate this license? The license will become active again.',
        buttonText: 'Reinstate',
        destructive: false,
      },
      renew: {
        title: 'Renew License',
        description: 'Are you sure you want to renew this license? This will extend the expiry date based on the policy duration.',
        buttonText: 'Renew',
        destructive: false,
      },
      revoke: {
        title: 'Revoke License',
        description: 'Are you sure you want to revoke this license? This action will permanently invalidate the license and cannot be undone.',
        buttonText: 'Revoke',
        destructive: true,
      },
      delete: {
        title: 'Delete License',
        description: 'Are you sure you want to delete this license? This will permanently remove the license and all associated machines. This action cannot be undone.',
        buttonText: 'Delete',
        destructive: true,
      },
    }
    return configs[action]
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (error || !license) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/licenses')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Licenses
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading license</p>
          <p className="text-sm">{(error as Error)?.message || 'License not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/licenses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {license.attributes.name || 'License Details'}
              </h2>
              <Badge variant={statusStyle.variant} className={statusStyle.className}>
                {license.attributes.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDate(license.attributes.created)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* License Key Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            License Key
          </CardTitle>
          <CardDescription>
            The unique license key for this license
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted p-3 text-sm font-mono break-all">
              {license.attributes.key}
            </code>
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(license.attributes.key)}
            >
              {copiedKey ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* License Info */}
        <Card>
          <CardHeader>
            <CardTitle>License Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Expiry</span>
              </div>
              <span className={expiryInfo.isExpired ? 'text-destructive' : ''}>
                {expiryInfo.text}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>Uses</span>
              </div>
              <span>
                {license.attributes.uses}
                {license.attributes.maxUses !== null && ` / ${license.attributes.maxUses}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Monitor className="h-4 w-4" />
                <span>Machines</span>
              </div>
              <span>
                {machineCount}
                {(license.attributes.maxMachines !== null || policy?.attributes?.maxMachines !== null) &&
                  ` / ${license.attributes.maxMachines ?? policy?.attributes?.maxMachines ?? 'Unlimited'}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Protected</span>
              </div>
              <Badge variant={license.attributes.protected ? 'default' : 'secondary'}>
                {license.attributes.protected ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Relationships */}
        <Card>
          <CardHeader>
            <CardTitle>Relationships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Policy</span>
              </div>
              <Badge variant="outline">
                {policy?.attributes?.name || 'Loading...'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>User</span>
              </div>
              <span>
                {user ? (
                  user.attributes.firstName && user.attributes.lastName
                    ? `${user.attributes.firstName} ${user.attributes.lastName}`
                    : user.attributes.email
                ) : license.relationships.user?.data ? (
                  'Loading...'
                ) : (
                  <span className="text-muted-foreground">Not assigned</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Monitor className="h-4 w-4" />
                <span>Machines</span>
              </div>
              <span>{machineCount} active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Manage the lifecycle of this license
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {canSuspend && (
              <Button
                variant="outline"
                onClick={() => setConfirmAction('suspend')}
              >
                <PauseCircle className="mr-2 h-4 w-4" />
                Suspend
              </Button>
            )}
            {canReinstate && (
              <Button
                variant="outline"
                onClick={() => setConfirmAction('reinstate')}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Reinstate
              </Button>
            )}
            {canRenew && (
              <Button
                variant="outline"
                onClick={() => setConfirmAction('renew')}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Renew
              </Button>
            )}
            {canRevoke && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmAction('revoke')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Revoke
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmAction('delete')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Machines List */}
      {machines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active Machines ({machineCount})
            </CardTitle>
            <CardDescription>
              Machines activated with this license
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {machines.map((machine) => (
                <div
                  key={machine.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {machine.attributes.name || 'Unnamed Machine'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {machine.attributes.fingerprint}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {machine.attributes.platform || 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction && getActionConfig(confirmAction).title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && getActionConfig(confirmAction).description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction && getActionConfig(confirmAction).destructive
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
              onClick={() => confirmAction && performAction.mutate(confirmAction)}
            >
              {performAction.isPending
                ? 'Processing...'
                : confirmAction && getActionConfig(confirmAction).buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
