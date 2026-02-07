'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchResources } from '@/lib/api'
import { DeleteConfirmDialog } from '@/components/forms/DeleteConfirmDialog'
import { AlertTriangle, Info } from 'lucide-react'

interface PolicyDeleteDialogProps {
  policy: any | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export function PolicyDeleteDialog({
  policy,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: PolicyDeleteDialogProps) {
  // Fetch license count for this policy
  const { data: licenseData, isLoading: isLoadingCount } = useQuery({
    queryKey: ['licenses', 'count', policy?.id],
    queryFn: () => 
      fetchResources('licenses', { 
        filters: { policy: policy?.id }, 
        limit: 1 
      }),
    enabled: !!policy && isOpen,
  })

  const licenseCount = licenseData?.meta?.count || 0
  const hasLicenses = licenseCount > 0

  const description = (
    <div className="space-y-4 pt-2">
      <p>
        Are you sure you want to delete <span className="font-semibold text-foreground">{policy?.attributes?.name}</span>?
        This action cannot be undone.
      </p>

      {isLoadingCount ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 animate-pulse" />
          Checking for associated licenses...
        </div>
      ) : hasLicenses ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Action Blocked</span>
          </div>
          <p className="mt-1 text-sm">
            This policy has <strong>{licenseCount}</strong> active license{licenseCount !== 1 ? 's' : ''}. 
            You must delete all associated licenses before this policy can be deleted.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-muted p-3 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <p className="text-sm">
              No licenses are associated with this policy. It is safe to delete.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Policy"
      description={description}
      isLoading={isLoading}
      confirmDisabled={hasLicenses || isLoadingCount}
    />
  )
}
