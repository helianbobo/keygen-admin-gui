'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DeleteConfirmDialog } from '@/components/forms/DeleteConfirmDialog'
import { deleteResource } from '@/lib/api'
import { toast } from 'sonner'

interface MachineDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  machineId: string
  fingerprint: string
  licenseKey?: string
}

export function MachineDeleteDialog({
  isOpen,
  onClose,
  machineId,
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

  const itemName = licenseKey 
    ? `machine with fingerprint "${fingerprint}" (License: ${licenseKey})`
    : `machine with fingerprint "${fingerprint}"`

  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => deleteMachine.mutate()}
      title="Delete Machine"
      itemName={itemName}
      isLoading={deleteMachine.isPending}
    />
  )
}
