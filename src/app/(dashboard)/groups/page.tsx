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
import { toast } from 'sonner'
import { Plus, RefreshCw, Eye, Trash2, Users, Search, X, Users2 } from 'lucide-react'

/**
 * Group interface matching Keygen API response structure.
 * @see https://keygen.sh/docs/api/groups/
 */
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

interface GroupsResponse {
  data: Group[]
  meta?: {
    count: number
    pages: number
    page: number
  }
}

interface CreateGroupResponse {
  data: Group
}

/**
 * Form data for creating a new group.
 */
interface CreateGroupForm {
  name: string
  maxUsers: string
  maxLicenses: string
  maxMachines: string
  metadata: string
}

export default function GroupsPage() {
  const router = useRouter()
  const { adminToken, baseUrl, accountId } = useAuth()
  const queryClient = useQueryClient()
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  
  const [createForm, setCreateForm] = useState<CreateGroupForm>({
    name: '',
    maxUsers: '',
    maxLicenses: '',
    maxMachines: '',
    metadata: '',
  })

  const { filters, setFilter, resetFilters } = useListFilter({
    defaultFilters: {
      pageSize: 100,
    },
  })

  // Fetch groups
  const { data: groupsData, isLoading, error, refetch } = useQuery<GroupsResponse>({
    queryKey: ['groups', filters.search],
    queryFn: async () => {
      const url = new URL(`${baseUrl}/accounts/${accountId}/groups`)
      if (filters.search) {
        url.searchParams.set('name', filters.search)
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${adminToken}`,
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status}`)
      }
      
      return response.json()
    },
    enabled: !!adminToken && !!accountId,
  })

  // Create group mutation
  const createGroup = useMutation({
    mutationFn: async (formData: CreateGroupForm) => {
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
      
      const response = await fetch(`${baseUrl}/accounts/${accountId}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.errors?.[0]?.detail || 'Failed to create group')
      }
      
      return response.json() as Promise<CreateGroupResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setCreateDialogOpen(false)
      setCreateForm({ name: '', maxUsers: '', maxLicenses: '', maxMachines: '', metadata: '' })
      toast.success('Group created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Delete group mutation
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
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
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setDeleteDialogOpen(false)
      setSelectedGroup(null)
      toast.success('Group deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim()) {
      toast.error('Group name is required')
      return
    }
    createGroup.mutate(createForm)
  }

  const handleDeleteClick = (group: Group) => {
    setSelectedGroup(group)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedGroup) {
      deleteGroup.mutate(selectedGroup.id)
    }
  }

  const groups = groupsData?.data || []

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users2 className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load groups</h3>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground">
            Manage user groups for bulk license management.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new group to organize users and manage licenses.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Group Name *</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
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
                      value={createForm.maxUsers}
                      onChange={(e) => setCreateForm({ ...createForm, maxUsers: e.target.value })}
                      placeholder="∞"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxLicenses">Max Licenses</Label>
                    <Input
                      id="maxLicenses"
                      type="number"
                      value={createForm.maxLicenses}
                      onChange={(e) => setCreateForm({ ...createForm, maxLicenses: e.target.value })}
                      placeholder="∞"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxMachines">Max Machines</Label>
                    <Input
                      id="maxMachines"
                      type="number"
                      value={createForm.maxMachines}
                      onChange={(e) => setCreateForm({ ...createForm, maxMachines: e.target.value })}
                      placeholder="∞"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="metadata">Metadata (JSON)</Label>
                  <Input
                    id="metadata"
                    value={createForm.metadata}
                    onChange={(e) => setCreateForm({ ...createForm, metadata: e.target.value })}
                    placeholder='{"department": "Engineering"}'
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createGroup.isPending}>
                  {createGroup.isPending ? 'Creating...' : 'Create Group'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="pl-8"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-2"
              onClick={() => setFilter('search', '')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Groups Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Limits</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Users2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No groups found</p>
                  {filters.search && (
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{group.attributes.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {group.id.slice(0, 8)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {group.attributes.maxUsers !== null ? (
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {group.attributes.maxUsers} users
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Users className="w-3 h-3 mr-1" />
                          ∞ users
                        </Badge>
                      )}
                      {group.attributes.maxLicenses !== null && (
                        <Badge variant="secondary">
                          Users: {group.attributes.maxLicenses}
                        </Badge>
                      )}
                      {group.attributes.maxMachines !== null && (
                        <Badge variant="secondary">
                          Machines: {group.attributes.maxMachines}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(group.attributes.created).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/groups/${group.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(group)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedGroup?.attributes.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
