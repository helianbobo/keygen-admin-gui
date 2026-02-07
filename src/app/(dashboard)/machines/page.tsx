'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw, Monitor, Eye } from 'lucide-react'

// Types for Keygen API responses
interface License {
  id: string
  type: 'licenses'
  attributes: {
    key: string
    status: string
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
    lastHeartbeat: string | null
    created: string
    updated: string
  }
  relationships: {
    license: {
      data: { type: 'licenses'; id: string } | null
    }
  }
}

interface MachinesResponse {
  data: Machine[]
  meta?: {
    count: number
    pages: number
    page: number
  }
}

interface LicensesResponse {
  data: License[]
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

// Heartbeat status colors
const HEARTBEAT_VARIANTS: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ALIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-500/80' },
  DEAD: { variant: 'destructive' },
  RESURRECTED: { variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-500/80 text-black' },
}

/**
 * Truncates a fingerprint for display.
 */
function truncateFingerprint(fingerprint: string, showChars: number = 10): string {
  if (fingerprint.length <= showChars * 2 + 3) return fingerprint
  return `${fingerprint.slice(0, showChars)}...${fingerprint.slice(-showChars)}`
}

/**
 * Truncates a license key for display.
 */
function truncateKey(key: string, showChars: number = 6): string {
  if (key.length <= showChars * 2 + 3) return key
  return `${key.slice(0, showChars)}...${key.slice(-showChars)}`
}

/**
 * Formats a timestamp for display.
 */
function formatHeartbeat(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export default function MachinesPage() {
  const { accountId, adminToken, baseUrl } = useAuth()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [platformFilter, setPlatformFilter] = useState<string>('ALL')

  // Fetch machines
  const {
    data: machinesData,
    isLoading,
    error,
    refetch,
  } = useQuery<MachinesResponse>({
    queryKey: ['machines', page, pageSize, platformFilter],
    queryFn: async () => {
      let url = `${baseUrl}/accounts/${accountId}/machines?page[size]=${pageSize}&page[number]=${page}`
      if (platformFilter !== 'ALL') {
        url += `&platform=${platformFilter}`
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

  // Fetch licenses for lookup (to show license key in table)
  const { data: licensesData } = useQuery<LicensesResponse>({
    queryKey: ['licenses-lookup'],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/accounts/${accountId}/licenses?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            Accept: 'application/vnd.api+json',
          },
        }
      )
      if (!response.ok) {
        return { data: [] }
      }
      return response.json()
    },
    enabled: !!accountId && !!adminToken,
  })

  // Map license IDs to keys
  const licenseMap = new Map(
    licensesData?.data?.map((l) => [l.id, l.attributes.key]) || []
  )

  const getLicenseKey = (licenseId: string | null | undefined): string => {
    if (!licenseId) return '—'
    const key = licenseMap.get(licenseId)
    return key ? truncateKey(key) : 'Unknown'
  }

  const machines = machinesData?.data || []
  const totalPages = machinesData?.meta?.pages || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Machines</h2>
          <p className="text-muted-foreground">
            View and manage activated machine devices.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={platformFilter} onValueChange={(value) => { setPlatformFilter(value); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Platforms</SelectItem>
              <SelectItem value="macOS">macOS</SelectItem>
              <SelectItem value="Windows">Windows</SelectItem>
              <SelectItem value="Linux">Linux</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading machines</p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fingerprint</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>License Key</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && machines.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Monitor className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No machines found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {platformFilter !== 'ALL'
              ? `No machines with platform "${platformFilter}" found.`
              : 'Machines are created when licenses are activated on devices.'}
          </p>
        </div>
      )}

      {/* Machines Table */}
      {!isLoading && !error && machines.length > 0 && (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fingerprint</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>License Key</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => {
                  const platform = machine.attributes.platform || 'Unknown'
                  const platformClass = PLATFORM_VARIANTS[platform] || ''
                  const heartbeatStatus = machine.attributes.heartbeatStatus
                  const heartbeatStyle = heartbeatStatus
                    ? HEARTBEAT_VARIANTS[heartbeatStatus] || { variant: 'secondary' as const }
                    : null

                  return (
                    <TableRow
                      key={machine.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/machines/${machine.id}`)}
                    >
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                          {truncateFingerprint(machine.attributes.fingerprint)}
                        </code>
                      </TableCell>
                      <TableCell>
                        {machine.attributes.name || (
                          <span className="text-muted-foreground">Unnamed</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="default"
                          className={platformClass || 'bg-gray-400 hover:bg-gray-400/80'}
                        >
                          {platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                          {getLicenseKey(machine.relationships?.license?.data?.id)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {formatHeartbeat(machine.attributes.lastHeartbeat)}
                          </span>
                          {heartbeatStyle && (
                            <Badge
                              variant={heartbeatStyle.variant}
                              className={`text-xs ${heartbeatStyle.className || ''}`}
                            >
                              {heartbeatStatus}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/machines/${machine.id}`)
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
