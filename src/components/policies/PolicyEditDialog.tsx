'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { updateResource } from '@/lib/api'

// Types
interface Policy {
  id: string
  type: 'policies'
  attributes: {
    name: string
    duration: number | null
    strict: boolean
    floating: boolean
    maxMachines: number | null
    maxProcesses: number | null
    maxUses: number | null
    expirationStrategy: string
    authenticationStrategy: string
    metadata: Record<string, unknown>
    created: string
    updated: string
  }
}

interface PolicyEditDialogProps {
  policy: Policy | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Duration presets in seconds
const DURATION_PRESETS = [
  { value: '', label: 'Lifetime (no expiration)' },
  { value: '604800', label: '7 days' },
  { value: '1209600', label: '14 days' },
  { value: '2592000', label: '30 days' },
  { value: '7776000', label: '90 days' },
  { value: '31536000', label: '1 year' },
  { value: 'custom', label: 'Custom (seconds)' },
]

// Expiration strategies
const EXPIRATION_STRATEGIES = [
  { value: 'RESTRICT_ACCESS', label: 'Restrict Access' },
  { value: 'RESET_VALIDATION', label: 'Reset Validation' },
  { value: 'REVOKE', label: 'Revoke' },
  { value: 'MAINTAIN_ACCESS', label: 'Maintain Access' },
]

// Authentication strategies
const AUTH_STRATEGIES = [
  { value: 'TOKEN', label: 'Token' },
  { value: 'LICENSE', label: 'License' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'ANONYMOUS', label: 'Anonymous' },
]

export function PolicyEditDialog({
  policy,
  isOpen,
  onClose,
  onSuccess,
}: PolicyEditDialogProps) {
  const { accountId, adminToken } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    durationPreset: '' as string,
    customDuration: '',
    maxMachines: '',
    maxProcesses: '',
    maxUses: '',
    strict: false,
    floating: false,
    expirationStrategy: 'RESTRICT_ACCESS',
    authenticationStrategy: 'TOKEN',
  })

  // Initialize form data when policy changes
  useEffect(() => {
    if (policy) {
      const duration = policy.attributes.duration
      let durationPreset = ''
      let customDuration = ''

      if (duration === null || duration === 0) {
        durationPreset = ''
      } else if (
        DURATION_PRESETS.some(
          (p) => p.value !== '' && p.value !== 'custom' && parseInt(p.value, 10) === duration
        )
      ) {
        durationPreset = duration.toString()
      } else {
        durationPreset = 'custom'
        customDuration = duration.toString()
      }

      setFormData({
        name: policy.attributes.name,
        durationPreset,
        customDuration,
        maxMachines: policy.attributes.maxMachines?.toString() || '',
        maxProcesses: policy.attributes.maxProcesses?.toString() || '',
        maxUses: policy.attributes.maxUses?.toString() || '',
        strict: policy.attributes.strict,
        floating: policy.attributes.floating,
        expirationStrategy: policy.attributes.expirationStrategy || 'RESTRICT_ACCESS',
        authenticationStrategy: policy.attributes.authenticationStrategy || 'TOKEN',
      })
    }
  }, [policy])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!policy || !accountId || !adminToken) return

    if (!formData.name.trim()) {
      toast.error('Policy name is required')
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate duration in seconds
      let duration: number | null = null
      if (formData.durationPreset === 'custom' && formData.customDuration) {
        duration = parseInt(formData.customDuration, 10)
      } else if (formData.durationPreset && formData.durationPreset !== '') {
        duration = parseInt(formData.durationPreset, 10)
      }

      const attributes: Record<string, unknown> = {
        name: formData.name,
        duration: duration,
        strict: formData.strict,
        floating: formData.floating,
        expirationStrategy: formData.expirationStrategy,
        authenticationStrategy: formData.authenticationStrategy,
      }

      // Only include max values if they are set
      if (formData.maxMachines) {
        attributes.maxMachines = parseInt(formData.maxMachines, 10)
      } else {
        attributes.maxMachines = null
      }

      if (formData.maxProcesses) {
        attributes.maxProcesses = parseInt(formData.maxProcesses, 10)
      } else {
        attributes.maxProcesses = null
      }

      if (formData.maxUses) {
        attributes.maxUses = parseInt(formData.maxUses, 10)
      } else {
        attributes.maxUses = null
      }

      await updateResource('policies', policy.id, attributes)

      onSuccess()
      onClose()
    } catch (error) {
      toast.error(`Failed to update policy: ${(error as Error).message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!policy) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
            <DialogDescription>
              Update the policy settings for {policy.attributes.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Pro License"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Duration */}
            <div className="grid gap-2">
              <Label>Duration</Label>
              <Select
                value={formData.durationPreset}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    durationPreset: value,
                    customDuration: value !== 'custom' ? '' : prev.customDuration,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.durationPreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Duration in seconds"
                    value={formData.customDuration}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customDuration: e.target.value,
                      }))
                    }
                    min="1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">seconds</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                How long licenses will remain valid after activation.
              </p>
            </div>

            {/* Mode Toggles */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Strict Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Require heartbeat
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.strict ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, strict: !prev.strict }))
                  }
                >
                  {formData.strict ? 'On' : 'Off'}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Floating</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow transfers
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.floating ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, floating: !prev.floating }))
                  }
                >
                  {formData.floating ? 'On' : 'Off'}
                </Button>
              </div>
            </div>

            {/* Limits */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-maxMachines">Max Machines</Label>
                <Input
                  id="edit-maxMachines"
                  type="number"
                  placeholder="∞"
                  value={formData.maxMachines}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxMachines: e.target.value,
                    }))
                  }
                  min="1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-maxProcesses">Max Processes</Label>
                <Input
                  id="edit-maxProcesses"
                  type="number"
                  placeholder="∞"
                  value={formData.maxProcesses}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxProcesses: e.target.value,
                    }))
                  }
                  min="1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-maxUses">Max Uses</Label>
                <Input
                  id="edit-maxUses"
                  type="number"
                  placeholder="∞"
                  value={formData.maxUses}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxUses: e.target.value,
                    }))
                  }
                  min="1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Leave empty for unlimited. These limits apply to licenses using this policy.
            </p>

            {/* Expiration Strategy */}
            <div className="grid gap-2">
              <Label>Expiration Strategy</Label>
              <Select
                value={formData.expirationStrategy}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    expirationStrategy: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                What happens when a license expires.
              </p>
            </div>

            {/* Authentication Strategy */}
            <div className="grid gap-2">
              <Label>Authentication Strategy</Label>
              <Select
                value={formData.authenticationStrategy}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    authenticationStrategy: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTH_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How licenses authenticate with the API.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
