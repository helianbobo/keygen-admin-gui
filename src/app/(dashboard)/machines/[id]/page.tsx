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
  RefreshCw,
  Trash2,
  Monitor,
  Cpu,
  Globe,
  Server,
  Key,
  Clock,
  Fingerprint,
  Hash,
  Activity,
} from 'lucide-react'

// Types
interface License {
  id: string
  type: 'licenses'
  attributes: {
    key: string
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'BANNED'
    name: string | null
    expiry: string | null
  }
}

interface Machine {
  id: string
  type: 'machines'
  attributes: {
    fingerprint: string
    name: string | null
    platform: string | null
    hostname: string | null
    cores: number | null
    ip: string | null
    heartbeatStatus: 'ALIVE' | 'DEAD' | 'RESURRECTED' | null
    heartbeatDuration: number | null
    lastHeartbeat: string | null
    nextHeartbeat: string | null
    lastCheckOut: string | null
    requireHeartbeat: boolean
    metadata: Record<string, unknown>
    created: string
    updated: string
  }
  relationships: {
    license: {
      data: { type: 'licenses'; id: string } | null
    }
  }
}

interface MachineResponse {
  data: Machine
}

interface LicenseResponse {
  data: License
}

// Status badge variants
const LICENSE_STATUS_VARIANTS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ACTIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-500/80' },
  INACTIVE: { variant: 'secondary', className: 'bg-gray-400 hover:bg-gray-400/80 text-white' },
  EXPIRED: { variant: 'destructive' },
  SUSPENDED: { variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-500/80 text-black' },
  BANNED: { variant: 'destructive' },
}

// Heartbeat status colors
const HEARTBEAT_VARIANTS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ALIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-500/80' },
  DEAD: { variant: 'destructive' },
  RESURRECTED: { variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-500/80 text-black' },
}

// Platform badge colors
const PLATFORM_VARIANTS: Record<string, string> = {
  macos: 'bg-gray-600 hover:bg-gray-600/80',
  macOS: 'bg-gray-600 hover:bg-gray-600/80',
  windows: 'bg-blue-500 hover:bg-blue-500/80',
  Windows: 'bg-blue-500 hover:bg-blue-500/80',
  linux: 'bg-orange-500 hover:bg-orange-500/80',
  Linux: 'bg-orange-500 hover:bg-orange-500/80',
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
 * Formats heartbeat as relative time.
 */
function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 0) {
    // Future timestamp (next heartbeat)
    const futureMins = Math.abs(diffMins)
    if (futureMins < 60) return `in ${futureMins}m`
    const futureHours = Math.floor(futureMins / 60)
    return `in ${futureHours}h`
  }

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`

  return formatDate(timestamp)
}

/**
 * Truncates a license key for display.
 */
function truncateKey(key: string, showChars: number = 8): string {
  if (key.length <= showChars * 2 + 3) return key
  return `${key.slice(0, showChars)}...${key.slice(-showChars)}`
}

export default function MachineDetailsPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const params = useParams()
  const machineId = params.id as string

  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)

  // Fetch machine details
  const {
    data: machineData,
    isLoading,
    error,
    refetch,
  } = useQuery<MachineResponse>({
    queryKey: ['machine', machineId],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/machines/${machineId}`,
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
    enabled: !!accountId && !!adminToken && !!machineId,
  })

  // Fetch related license
  const { data: licenseData } = useQuery<LicenseResponse>({
    queryKey: ['license', machineData?.data?.relationships?.license?.data?.id],
    queryFn: async () => {
      const licenseId = machineData?.data?.relationships?.license?.data?.id
      if (!licenseId) return null
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/licenses/${licenseId}`,
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
    enabled: !!accountId && !!adminToken && !!machineData?.data?.relationships?.license?.data?.id,
  })

  // Deactivate (delete) mutation
  const deactivateMachine = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/machines/${machineId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Accept: 'application/vnd.api+json',
          },
        }
      )
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.errors?.[0]?.detail || `Error: ${response.status}`)
      }
      return true
    },
    onSuccess: () => {
      setShowDeactivateDialog(false)
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['license-machines'] })
      toast.success('Machine deactivated successfully')
      router.push('/machines')
    },
    onError: (error: Error) => {
      setShowDeactivateDialog(false)
      toast.error(`Failed to deactivate: ${error.message}`)
    },
  })

  const machine = machineData?.data
  const license = licenseData?.data

  const platform = machine?.attributes.platform || 'Unknown'
  const platformClass = PLATFORM_VARIANTS[platform] || ''
  const heartbeatStatus = machine?.attributes.heartbeatStatus
  const heartbeatStyle = heartbeatStatus
    ? HEARTBEAT_VARIANTS[heartbeatStatus] || { variant: 'secondary' as const }
    : null
  const licenseStatusStyle = license
    ? LICENSE_STATUS_VARIANTS[license.attributes.status] || { variant: 'secondary' as const }
    : { variant: 'secondary' as const }

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
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !machine) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/machines')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Machines
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading machine</p>
          <p className="text-sm">{(error as Error)?.message || 'Machine not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/machines')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {machine.attributes.name || 'Machine Details'}
              </h2>
              <Badge
                variant="default"
                className={platformClass || 'bg-gray-400 hover:bg-gray-400/80'}
              >
                {platform}
              </Badge>
              {heartbeatStyle && (
                <Badge
                  variant={heartbeatStyle.variant}
                  className={heartbeatStyle.className}
                >
                  {heartbeatStatus}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDate(machine.attributes.created)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fingerprint Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Machine Fingerprint
          </CardTitle>
          <CardDescription>
            The unique identifier for this machine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block rounded-md bg-muted p-3 text-sm font-mono break-all">
            {machine.attributes.fingerprint}
          </code>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Machine Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Machine Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>Name</span>
              </div>
              <span>{machine.attributes.name || <span className="text-muted-foreground">Not set</span>}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Server className="h-4 w-4" />
                <span>Hostname</span>
              </div>
              <span>{machine.attributes.hostname || <span className="text-muted-foreground">Unknown</span>}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Cpu className="h-4 w-4" />
                <span>Cores</span>
              </div>
              <span>{machine.attributes.cores ?? <span className="text-muted-foreground">Unknown</span>}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>IP Address</span>
              </div>
              <code className="text-sm">{machine.attributes.ip || <span className="text-muted-foreground font-sans">Unknown</span>}</code>
            </div>
          </CardContent>
        </Card>

        {/* License Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              License Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {license ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Key className="h-4 w-4" />
                    <span>License Key</span>
                  </div>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                    {truncateKey(license.attributes.key)}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span>Status</span>
                  </div>
                  <Badge
                    variant={licenseStatusStyle.variant}
                    className={licenseStatusStyle.className}
                  >
                    {license.attributes.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Expiry</span>
                  </div>
                  <span>
                    {license.attributes.expiry
                      ? new Date(license.attributes.expiry).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/licenses/${license.id}`)}
                >
                  View License Details
                </Button>
              </>
            ) : machineData?.data?.relationships?.license?.data?.id ? (
              <p className="text-muted-foreground">Loading license...</p>
            ) : (
              <p className="text-muted-foreground">No license associated</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heartbeat Info */}
      {machine.attributes.requireHeartbeat && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Heartbeat Status
            </CardTitle>
            <CardDescription>
              Monitor the machine&apos;s check-in status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              {heartbeatStyle ? (
                <Badge variant={heartbeatStyle.variant} className={heartbeatStyle.className}>
                  {heartbeatStatus}
                </Badge>
              ) : (
                <span className="text-muted-foreground">No heartbeat required</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Heartbeat</span>
              <span>{formatRelativeTime(machine.attributes.lastHeartbeat)}</span>
            </div>
            {machine.attributes.nextHeartbeat && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next Expected</span>
                <span>{formatRelativeTime(machine.attributes.nextHeartbeat)}</span>
              </div>
            )}
            {machine.attributes.heartbeatDuration && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Interval</span>
                <span>{Math.floor(machine.attributes.heartbeatDuration / 60)} minutes</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Manage this machine activation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeactivateDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Deactivate Machine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Machine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this machine? This will remove the machine from the license and free up an activation slot. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateMachine.mutate()}
            >
              {deactivateMachine.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
