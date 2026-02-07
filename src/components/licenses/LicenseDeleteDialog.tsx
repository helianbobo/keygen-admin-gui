'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DeleteConfirmDialog } from '@/components/forms/DeleteConfirmDialog'
import { deleteResource, ApiError } from '@/lib/api'
import { toast } from 'sonner'

interface LicenseDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  licenseId: string
  licenseKey: string
  userName?: string
}

export function LicenseDeleteDialog({
  isOpen,
  onClose,
  licenseId,
  licenseKey,
  userName,
}: LicenseDeleteDialogProps) {
  const queryClient = useQueryClient()

  const deleteLicense = useMutation({
    mutationFn: async () => {
      await deleteResource('licenses', licenseId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] })
      toast.success('License deleted successfully')
      onClose()
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('Cannot delete license: it has active machines. Please revoke machines first.')
      } else {
        toast.error(`Failed to delete license: ${error.message}`)
      }
    },
  })

  const itemName = userName 
    ? `license "${licenseKey.slice(0, 12)}..." assigned to ${userName}`
    : `license "${licenseKey.slice(0, 12)}..."`

  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => deleteLicense.mutate()}
      title="Delete License"
      itemName={itemName}
      isLoading={deleteLicense.isPending}
    />
  )
}
