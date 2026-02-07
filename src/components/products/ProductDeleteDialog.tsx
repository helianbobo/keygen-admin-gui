'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { DeleteConfirmDialog } from '@/components/forms/DeleteConfirmDialog'
import { deleteResource } from '@/lib/api'
import { AlertTriangle } from 'lucide-react'

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

interface ProductDeleteDialogProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
}

interface DependencyCount {
  policies: number
  licenses: number
  loading: boolean
  error: string | null
}

export function ProductDeleteDialog({
  product,
  isOpen,
  onClose,
  onDeleted,
}: ProductDeleteDialogProps) {
  const { accountId, adminToken, baseUrl } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [dependencies, setDependencies] = useState<DependencyCount>({
    policies: 0,
    licenses: 0,
    loading: true,
    error: null,
  })

  // Fetch dependency counts when dialog opens
  useEffect(() => {
    if (!isOpen || !product || !accountId || !adminToken) {
      setDependencies({ policies: 0, licenses: 0, loading: false, error: null })
      return
    }

    const fetchDependencies = async () => {
      setDependencies((prev) => ({ ...prev, loading: true, error: null }))

      try {
        // Fetch policies count for this product
        const policiesResponse = await fetch(
          `${baseUrl}/accounts/${accountId}/policies?filter[product]=${product.id}&page[size]=1`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              Accept: 'application/vnd.api+json',
            },
          }
        )

        // Fetch licenses count for this product
        const licensesResponse = await fetch(
          `${baseUrl}/accounts/${accountId}/licenses?filter[product]=${product.id}&page[size]=1`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
              Accept: 'application/vnd.api+json',
            },
          }
        )

        if (!policiesResponse.ok || !licensesResponse.ok) {
          throw new Error('Failed to fetch dependency counts')
        }

        const policiesData = await policiesResponse.json()
        const licensesData = await licensesResponse.json()

        setDependencies({
          policies: policiesData.meta?.count ?? policiesData.data?.length ?? 0,
          licenses: licensesData.meta?.count ?? licensesData.data?.length ?? 0,
          loading: false,
          error: null,
        })
      } catch (err) {
        setDependencies({
          policies: 0,
          licenses: 0,
          loading: false,
          error: 'Could not check for dependencies',
        })
      }
    }

    fetchDependencies()
  }, [isOpen, product, accountId, adminToken, baseUrl])

  const handleConfirm = async () => {
    if (!product) return

    setIsDeleting(true)
    try {
      await deleteResource('products', product.id)
      onDeleted()
    } catch (err) {
      // Error will be handled by the parent via toast
      throw err
    } finally {
      setIsDeleting(false)
    }
  }

  const hasDependencies = dependencies.policies > 0 || dependencies.licenses > 0

  // Build description with dependency warnings
  const buildDescription = () => {
    if (dependencies.loading) {
      return 'Checking for associated resources...'
    }

    if (dependencies.error) {
      return (
        <>
          Are you sure you want to delete{' '}
          <span className="font-semibold text-foreground">
            {product?.attributes.name}
          </span>
          ? This action cannot be undone.
          <div className="mt-2 text-sm text-muted-foreground">
            ⚠️ {dependencies.error}
          </div>
        </>
      )
    }

    if (hasDependencies) {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Warning: This product has dependencies</p>
              <ul className="mt-1 list-inside list-disc">
                {dependencies.policies > 0 && (
                  <li>
                    {dependencies.policies} {dependencies.policies === 1 ? 'policy' : 'policies'}
                  </li>
                )}
                {dependencies.licenses > 0 && (
                  <li>
                    {dependencies.licenses} {dependencies.licenses === 1 ? 'license' : 'licenses'}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <p>
            Deleting{' '}
            <span className="font-semibold text-foreground">
              {product?.attributes.name}
            </span>{' '}
            will also delete all associated policies, licenses, and machines.
            This action cannot be undone.
          </p>
        </div>
      )
    }

    return (
      <>
        Are you sure you want to delete{' '}
        <span className="font-semibold text-foreground">
          {product?.attributes.name}
        </span>
        ? This action cannot be undone.
      </>
    )
  }

  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Delete Product"
      description={buildDescription()}
      isLoading={isDeleting || dependencies.loading}
    />
  )
}
