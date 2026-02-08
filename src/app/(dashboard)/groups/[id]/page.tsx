'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner'
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Key,
  Monitor,
  Trash2,
  Users2,
  Calendar,
  Hash,
  Save,
} from 'lucide-react'

// Types
interface Group {
  id: string
  type: 'groups'
  attributes: {
    name: string
    maxUsers: number | null
    maxLicenses: number | null
    maxMachines: number | null
    metadata: Record<string, unknown>
    created: string
    updated: string
  }
  relationships: {
    account: {
      data: { type: 'accounts'; id: string }
    }
    users: {
      links: { related: string }
    }
    licenses: {
      links: { related: string }
    }
    machines: {
      links: { related: string }
    }
  }
}

interface User {
  id: string
  type: 'users'
  attributes: {
    email: string
    firstName: string | null
    lastName: string | null
    role: string
    status: string
  }
}

interface License {
  id: string
  type: 'licenses'
  attributes: {
    key: string
    name: string | null
    status: string
  }
}

interface GroupResponse {
  data: Group
}

interface UsersResponse {
  data: User[]
}

interface LicensesResponse {
  data: License[]
}

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string
  const { adminToken, baseUrl, accountId } = useAuth()
  const queryClient = useQueryClient()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  const [editForm, setEditForm] = useState({
    name: '',
    maxUsers: '',
    maxLicenses: '',
    maxMachines: '',
    metadata: '',
  })

  // Fetch group details
  const { data: groupData, isLoading: isGroupLoading, error, refetch } = useQuery<GroupResponse>({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/accounts/${accountId}/groups/${groupId}`, {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${adminToken}`,
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group: ${response.status}`)
      }
      
      return response.json()
    },
    enabled: !!adminToken && !!accountId && !!groupId,
  })

  // Fetch group users
  const { data: usersData, isLoading: isUsersLoading } = useQuery<UsersResponse>({
    queryKey: ['group-users', groupId],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/accounts/${accountId}/groups/${groupId}/users`, {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${adminToken}`,
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group users: ${response.status}`)
      }
      
      return response.json()
    },
    enabled: !!adminToken && !!accountId && !!groupId,
  })

  // Fetch group licenses
  const { data: licensesData, isLoading: isLicensesLoading } = useQuery<LicensesResponse>({
    queryKey: ['group-licenses', groupId],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/accounts/${accountId}/groups/${groupId}/licenses`, {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${adminToken}`,
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group licenses: ${response.status}`)
      }
      
      return response.json()
    },
    enabled: !!adminToken && !!accountId && !!groupId,
  })

  // Update group mutation
  const updateGroup = useMutation({
    mutationFn: async (formData: typeof editForm) => {
      const body = {
        data: {
          type: 'groups',
          attributes: {
            name: formData.name,
            maxUsers: formData.maxUsers ? parseInt(formData.maxUsers) : null,
            maxLicenses: formData.maxLicenses ? parseInt(formData.maxLicenses) : null,
            maxMachines: formData.maxMachines ? parseInt(formData.maxMachines) : null,
            metadata: formData.metadata ? JSON.parse(formData.metadata) : {},
          },
        },
      }
      
      const response = await fetch(`${baseUrl}/accounts/${accountId}/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.errors?.[0]?.detail || 'Failed to update group')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      setEditDialogOpen(false)
      toast.success('Group updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Delete group mutation
  const deleteGroup = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${baseUrl}/accounts/${accountId}/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${adminToken}`,
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete group: ${response.status}`)
      }
    },
    onSuccess: () => {
      toast.success('Group deleted successfully')
      router.push('/groups')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleEditClick = () => {
    if (group) {
      setEditForm({
        name: group.attributes.name,
        maxUsers: group.attributes.maxUsers?.toString() || '',
        maxLicenses: group.attributes.maxLicenses?.toString() || '',
        maxMachines: group.attributes.maxMachines?.toString() || '',
        metadata: JSON.stringify(group.attributes.metadata, null, 2),
      })
      setEditDialogOpen(true)
    }
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateGroup.mutate(editForm)
  }

  const handleDelete = () => {
    deleteGroup.mutate()
  }

  const group = groupData?.data
  const users = usersData?.data || []
  const licenses = licensesData?.data || []

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users2 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load group</h3>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <div className="flex gap-2">
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button variant="outline" onClick={() => router.push('/groups')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Groups
          </Button>
        </div>
      </div>
    )
  }

  if (isGroupLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/groups')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-[200px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users2 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Group not found</h3>
        <Button onClick={() => router.push('/groups')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Groups
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/groups')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{group.attributes.name}</h2>
            <p className="text-muted-foreground font-mono text-sm">
              {group.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleEditClick}>
            <Save className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {group.attributes.maxUsers !== null 
                ? `Max ${group.attributes.maxUsers}` 
                : 'No limit'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licenses</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{licenses.length}</div>
            <p className="text-xs text-muted-foreground">
              {group.attributes.maxLicenses !== null 
                ? `Max ${group.attributes.maxLicenses}` 
                : 'No limit'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Machines</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-{/* TODO: Fetch machine count */}</div>
            <p className="text-xs text-muted-foreground">
              {group.attributes.maxMachines !== null 
                ? `Max ${group.attributes.maxMachines}` 
                : 'No limit'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(group.attributes.created).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(group.attributes.created).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members Section */}
      <Card>
        <CardHeader>
          <CardTitle>Group Members</CardTitle>
          <CardDescription>
            Users belonging to this group
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isUsersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No members in this group</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => router.push(`/users/${user.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user.attributes.firstName?.[0] || user.attributes.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.attributes.firstName && user.attributes.lastName
                          ? `${user.attributes.firstName} ${user.attributes.lastName}`
                          : user.attributes.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.attributes.email}</p>
                    </div>
                  </div>
                  <Badge variant={user.attributes.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {user.attributes.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Licenses Section */}
      <Card>
        <CardHeader>
          <CardTitle>Group Licenses</CardTitle>
          <CardDescription>
            Licenses associated with this group
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLicensesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No licenses for this group</p>
            </div>
          ) : (
            <div className="space-y-2">
              {licenses.map((license) => (
                <div
                  key={license.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => router.push(`/licenses/${license.id}`)}
                >
                  <div>
                    <p className="font-medium font-mono">
                      {license.attributes.key.slice(0, 16)}...
                    </p>
                    {license.attributes.name && (
                      <p className="text-sm text-muted-foreground">{license.attributes.name}</p>
                    )}
                  </div>
                  <Badge 
                    variant={license.attributes.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={license.attributes.status === 'ACTIVE' ? 'bg-green-500' : ''}
                  >
                    {license.attributes.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata Section */}
      {Object.keys(group.attributes.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm">
              {JSON.stringify(group.attributes.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>
                Update group settings and limits.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="maxUsers">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={editForm.maxUsers}
                    onChange={(e) => setEditForm({ ...editForm, maxUsers: e.target.value })}
                    placeholder="∞"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxLicenses">Max Licenses</Label>
                  <Input
                    id="maxLicenses"
                    type="number"
                    value={editForm.maxLicenses}
                    onChange={(e) => setEditForm({ ...editForm, maxLicenses: e.target.value })}
                    placeholder="∞"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxMachines">Max Machines</Label>
                  <Input
                    id="maxMachines"
                    type="number"
                    value={editForm.maxMachines}
                    onChange={(e) => setEditForm({ ...editForm, maxMachines: e.target.value })}
                    placeholder="∞"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <textarea
                  id="metadata"
                  value={editForm.metadata}
                  onChange={(e) => setEditForm({ ...editForm, metadata: e.target.value })}
                  placeholder='{"department": "Engineering"}'
                  className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateGroup.isPending}>
                {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{group.attributes.name}</strong>?
              This action cannot be undone and will remove all group associations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroup.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
