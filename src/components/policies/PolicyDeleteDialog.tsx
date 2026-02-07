'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchResources } from '@/lib/api'
import { DeleteConfirmDialog } from '@/components/forms/DeleteConfirmDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Blocked</AlertTitle>
          <AlertDescription>
            This policy has <strong>{licenseCount}</strong> active license{licenseCount !== 1 ? 's' : ''}. 
            You must delete all associated licenses before this policy can be deleted.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No licenses are associated with this policy. It is safe to delete.
          </AlertDescription>
        </Alert>
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
