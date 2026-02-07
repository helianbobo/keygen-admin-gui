'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { useListFilter } from '@/hooks/useListFilter'
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
import { Plus, RefreshCw, Eye, Trash2, Users, Search, X } from 'lucide-react'

/**
 * User interface matching Keygen API response structure.
 * @see https://keygen.sh/docs/api/users/
 */
interface User {
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

interface UsersResponse {
  data: User[]
  meta?: {
    count: number
    pages: number
    page: number
  }
}

interface CreateUserResponse {
  data: User
}

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
 * Formats a date string for display.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats user name, falling back to email if no name is set.
 */
function formatName(user: User): string {
  const { firstName, lastName } = user.attributes
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  if (firstName) return firstName
  if (lastName) return lastName
  return '—'
}

/**
 * Users management page component.
 * Displays a list of all users with create and delete functionality.
 */
export default function UsersPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const { filters, setFilter, resetFilters } = useListFilter({
    defaultFilters: {
      pageSize: 100,
    }
  })

  // Role filter state
  const [roleFilter, setRoleFilter] = useState<string>('ALL')

  // Form state for creating a new user
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    password: '',
  })

  // Fetch users with filters
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useQuery<UsersResponse>({
    queryKey: ['users', filters.search, filters.status, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: filters.pageSize.toString(),
      })

      if (filters.search) {
        params.set('query', filters.search)
      }

      if (filters.status && filters.status !== 'ALL') {
        params.set('status', filters.status)
      }

      if (roleFilter !== 'ALL') {
        params.set('role', roleFilter)
      }

      const response = await fetch(`${baseUrl}/accounts/${accountId}/users?${params.toString()}`, {
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

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (data: typeof formData): Promise<CreateUserResponse> => {
      const payload: {
        data: {
          type: 'users'
          attributes: {
            email: string
            firstName?: string
            lastName?: string
            role?: string
            password?: string
          }
        }
      } = {
        data: {
          type: 'users',
          attributes: {
            email: data.email,
          },
        },
      }

      // Add optional attributes
      if (data.firstName) {
        payload.data.attributes.firstName = data.firstName
      }
      if (data.lastName) {
        payload.data.attributes.lastName = data.lastName
      }
      if (data.role && data.role !== 'user') {
        payload.data.attributes.role = data.role
      }
      if (data.password) {
        payload.data.attributes.password = data.password
      }

      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/users`,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsCreateDialogOpen(false)
      resetForm()
      toast.success('User created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`)
    },
  })

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/users/${userId}`,
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
      return userId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUserToDelete(null)
      toast.success('User deleted successfully')
    },
    onError: (error: Error) => {
      setUserToDelete(null)
      toast.error(`Failed to delete user: ${error.message}`)
    },
  })

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      password: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email) {
      toast.error('Email is required')
      return
    }
    createUser.mutate(formData)
  }

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false)
    resetForm()
  }

  const handleResetFilters = () => {
    resetFilters()
    setRoleFilter('ALL')
  }

  const users = usersData?.data || []
  const hasActiveFilters = filters.search || (filters.status && filters.status !== 'ALL') || roleFilter !== 'ALL'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage your users and their access permissions.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (!open) handleCloseCreateDialog()
            else setIsCreateDialogOpen(true)
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create User</DialogTitle>
                  <DialogDescription>
                    Add a new user to your account. They will receive access based on their role.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="read-only">Read Only</SelectItem>
                        <SelectItem value="sales-agent">Sales Agent</SelectItem>
                        <SelectItem value="support-agent">Support Agent</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The role determines what actions the user can perform.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Leave empty for no password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, password: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      If not set, the user won&apos;t be able to log in with a password.
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
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email or name..."
            className="pl-8"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select 
            value={filters.status || 'ALL'} 
            onValueChange={(val) => setFilter('status', val === 'ALL' ? '' : val)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="BANNED">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="read-only">Read Only</SelectItem>
              <SelectItem value="sales-agent">Sales Agent</SelectItem>
              <SelectItem value="support-agent">Support Agent</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetFilters}
              className="h-9 px-2 lg:px-3"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading users</p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && users.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No users found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'No users match the selected filters.'
              : 'Create your first user to get started.'}
          </p>
          <div className="mt-4 flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            )}
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      {!isLoading && !error && users.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const statusStyle = STATUS_VARIANTS[user.attributes.status] || { variant: 'secondary' as const }
                const roleStyle = ROLE_VARIANTS[user.attributes.role] || { variant: 'outline' as const }
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/users/${user.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium">{user.attributes.email}</span>
                    </TableCell>
                    <TableCell>{formatName(user)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={roleStyle.variant}
                        className={roleStyle.className}
                      >
                        {user.attributes.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusStyle.variant}
                        className={statusStyle.className}
                      >
                        {user.attributes.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.attributes.created)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/users/${user.id}`)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUserToDelete(user)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user &quot;{userToDelete?.attributes.email}&quot;?
              This action cannot be undone. All associated licenses and machines will be orphaned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => userToDelete && deleteUser.mutate(userToDelete.id)}
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
