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
  Ban,
  ShieldCheck,
  Mail,
  User,
  Shield,
  Calendar,
  Key,
  Clock,
} from 'lucide-react'

/**
 * User interface matching Keygen API response structure.
 */
interface UserData {
  id: string
  type: 'users'
  attributes: {
    email: string
    firstName: string | null
    lastName: string | null
    role: 'admin' | 'developer' | 'read-only' | 'sales-agent' | 'support-agent' | 'user'
    status: 'ACTIVE' | 'INACTIVE' | 'BANNED'
    metadata: Record<string, unknown>
    created: string
    updated: string
  }
}

interface UserResponse {
  data: UserData
}

interface License {
  id: string
  type: 'licenses'
  attributes: {
    key: string
    name: string | null
    status: string
    expiry: string | null
  }
}

interface LicensesResponse {
  data: License[]
  meta?: {
    count: number
  }
}

type ActionType = 'ban' | 'unban' | 'delete'

/**
 * Status badge styling configuration.
 */
const STATUS_VARIANTS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ACTIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-500/80' },
  INACTIVE: { variant: 'secondary', className: 'bg-gray-400 hover:bg-gray-400/80 text-white' },
  BANNED: { variant: 'destructive' },
}

/**
 * Role badge styling configuration.
 */
const ROLE_VARIANTS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  admin: { variant: 'default', className: 'bg-purple-500 hover:bg-purple-500/80' },
  developer: { variant: 'default', className: 'bg-blue-500 hover:bg-blue-500/80' },
  'read-only': { variant: 'secondary' },
  'sales-agent': { variant: 'default', className: 'bg-orange-500 hover:bg-orange-500/80' },
  'support-agent': { variant: 'default', className: 'bg-teal-500 hover:bg-teal-500/80' },
  user: { variant: 'outline' },
}

/**
 * Formats a date string for detailed display.
 */
function formatDate(dateStr: string): string {
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
 * Formats user's full name.
 */
function formatName(user: UserData): string {
  const { firstName, lastName } = user.attributes
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  if (firstName) return firstName
  if (lastName) return lastName
  return 'No name set'
}

/**
 * User details page component.
 * Displays user information and provides ban/unban/delete actions.
 */
export default function UserDetailsPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null)

  // Fetch user details
  const {
    data: userData,
    isLoading,
    error,
    refetch,
  } = useQuery<UserResponse>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/users/${userId}`,
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
    enabled: !!accountId && !!adminToken && !!userId,
  })

  // Fetch user's licenses
  const { data: licensesData } = useQuery<LicensesResponse>({
    queryKey: ['user-licenses', userId],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/users/${userId}/licenses`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Accept: 'application/vnd.api+json',
          },
        }
      )
      if (!response.ok) {
        // If endpoint fails, return empty
        return { data: [] }
      }
      return response.json()
    },
    enabled: !!accountId && !!adminToken && !!userId,
  })

  // Action mutations
  const performAction = useMutation({
    mutationFn: async (action: ActionType) => {
      let url: string
      let method: string = 'POST'

      switch (action) {
        case 'ban':
          url = `${baseUrl}/accounts/${accountId}/users/${userId}/actions/ban`
          break
        case 'unban':
          url = `${baseUrl}/accounts/${accountId}/users/${userId}/actions/unban`
          break
        case 'delete':
          url = `${baseUrl}/accounts/${accountId}/users/${userId}`
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
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      const messages: Record<ActionType, string> = {
        ban: 'User banned successfully',
        unban: 'User unbanned successfully',
        delete: 'User deleted successfully',
      }

      toast.success(messages[action])

      if (action === 'delete') {
        router.push('/users')
      } else {
        refetch()
      }
    },
    onError: (error: Error) => {
      setConfirmAction(null)
      toast.error(`Action failed: ${error.message}`)
    },
  })

  const user = userData?.data
  const licenses = licensesData?.data || []
  const licenseCount = licenses.length

  const statusStyle = user ? STATUS_VARIANTS[user.attributes.status] || { variant: 'secondary' as const } : { variant: 'secondary' as const }
  const roleStyle = user ? ROLE_VARIANTS[user.attributes.role] || { variant: 'outline' as const } : { variant: 'outline' as const }

  // Determine which actions are available based on status
  const canBan = user?.attributes.status !== 'BANNED'
  const canUnban = user?.attributes.status === 'BANNED'

  const getActionConfig = (action: ActionType) => {
    const configs: Record<ActionType, { title: string; description: string; buttonText: string; destructive: boolean }> = {
      ban: {
        title: 'Ban User',
        description: 'Are you sure you want to ban this user? They will lose access to all their licenses and won\'t be able to authenticate.',
        buttonText: 'Ban User',
        destructive: true,
      },
      unban: {
        title: 'Unban User',
        description: 'Are you sure you want to unban this user? They will regain access to their licenses and authentication.',
        buttonText: 'Unban User',
        destructive: false,
      },
      delete: {
        title: 'Delete User',
        description: 'Are you sure you want to delete this user? This action cannot be undone. All associated data will be permanently removed.',
        buttonText: 'Delete User',
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

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading user</p>
          <p className="text-sm">{(error as Error)?.message || 'User not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/users')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {formatName(user)}
              </h2>
              <Badge variant={statusStyle.variant} className={statusStyle.className}>
                {user.attributes.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {user.attributes.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <span className="font-medium">{user.attributes.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>First Name</span>
              </div>
              <span>{user.attributes.firstName || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Last Name</span>
              </div>
              <span>{user.attributes.lastName || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Role</span>
              </div>
              <Badge variant={roleStyle.variant} className={roleStyle.className}>
                {user.attributes.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Key className="h-4 w-4" />
                <span>Licenses</span>
              </div>
              <span className="font-medium">{licenseCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created</span>
              </div>
              <span className="text-sm">{formatDate(user.attributes.created)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Updated</span>
              </div>
              <span className="text-sm">{formatDate(user.attributes.updated)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata (if any) */}
      {Object.keys(user.attributes.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>
              Custom data attached to this user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto">
              {JSON.stringify(user.attributes.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* User's Licenses */}
      {licenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Licenses ({licenseCount})
            </CardTitle>
            <CardDescription>
              Licenses associated with this user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {licenses.map((license) => (
                <div
                  key={license.id}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/licenses/${license.id}`)}
                >
                  <div>
                    <p className="font-medium">
                      {license.attributes.name || 'Unnamed License'}
                    </p>
                    <code className="text-xs text-muted-foreground">
                      {license.attributes.key.slice(0, 16)}...
                    </code>
                  </div>
                  <Badge variant="outline">{license.attributes.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Manage this user&apos;s access and account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {canBan && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmAction('ban')}
              >
                <Ban className="mr-2 h-4 w-4" />
                Ban User
              </Button>
            )}
            {canUnban && (
              <Button
                variant="outline"
                onClick={() => setConfirmAction('unban')}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Unban User
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmAction('delete')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </Button>
          </div>
        </CardContent>
      </Card>

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
