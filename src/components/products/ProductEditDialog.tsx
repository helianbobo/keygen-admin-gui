'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
interface Product {
  id: string
  type: 'products'
  attributes: {
    name: string
    code: string | null
    distributionStrategy: string
    url: string | null
    platforms: string[]
    permissions: string[]
    metadata: Record<string, unknown>
    created: string
    updated: string
  }
}

interface ProductEditDialogProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const DISTRIBUTION_STRATEGIES = [
  { value: 'LICENSED', label: 'Licensed' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
]

const PLATFORM_OPTIONS = [
  'Windows',
  'macOS',
  'Linux',
  'iOS',
  'Android',
  'Web',
]

export function ProductEditDialog({
  product,
  isOpen,
  onClose,
  onSuccess,
}: ProductEditDialogProps) {
  const { accountId, adminToken, baseUrl } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    url: '',
    distributionStrategy: 'LICENSED',
    platforms: [] as string[],
  })

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.attributes.name,
        code: product.attributes.code || '',
        url: product.attributes.url || '',
        distributionStrategy: product.attributes.distributionStrategy,
        platforms: product.attributes.platforms || [],
      })
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!product || !accountId || !adminToken) return

    if (!formData.name.trim()) {
      toast.error('Product name is required')
      return
    }

    setIsSubmitting(true)

    try {
      await updateResource('products', product.id, {
        name: formData.name,
        code: formData.code || null,
        url: formData.url || null,
        distributionStrategy: formData.distributionStrategy,
        platforms: formData.platforms.length > 0 ? formData.platforms : null,
      })

      onSuccess()
      onClose()
    } catch (error) {
      toast.error(`Failed to update product: ${(error as Error).message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }))
  }

  if (!product) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product information for {product.attributes.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="My Application"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                placeholder="my-app"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                A unique identifier for the product (optional).
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                type="url"
                placeholder="https://example.com/product"
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Product website or download link (optional).
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Distribution Strategy</Label>
              <Select
                value={formData.distributionStrategy}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    distributionStrategy: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTRIBUTION_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((platform) => (
                  <Badge
                    key={platform}
                    variant={
                      formData.platforms.includes(platform)
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer"
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to select platforms (optional).
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
