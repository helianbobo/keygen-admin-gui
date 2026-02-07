'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DeleteConfirmDialog } from '@/components/forms/DeleteConfirmDialog'
import { deleteResource, ApiError } from '@/lib/api'
import { toast } from 'sonner'

interface MachineDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  machineId: string
  machineName?: string | null
  fingerprint: string
  licenseKey?: string
}

export function MachineDeleteDialog({
  isOpen,
  onClose,
  machineId,
  machineName,
  fingerprint,
  licenseKey,
}: MachineDeleteDialogProps) {
  const queryClient = useQueryClient()

  const deleteMachine = useMutation({
    mutationFn: async () => {
      await deleteResource('machines', machineId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      toast.success('Machine deleted successfully')
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete machine: ${error.message}`)
    },
  })

  const itemName = machineName 
    ? `machine "${machineName}" (${fingerprint.slice(0, 16)}...)`
    : `machine "${fingerprint.slice(0, 24)}..."`

  const description = licenseKey 
    ? `This will permanently delete ${itemName} associated with license "${licenseKey.slice(0, 12)}...". This action cannot be undone.`
    : `This will permanently delete ${itemName}. This action cannot be undone.`

  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => deleteMachine.mutate()}
      title="Delete Machine"
      description={description}
      isLoading={deleteMachine.isPending}
    />
  )
}
