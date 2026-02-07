'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package } from 'lucide-react'

export default function ProductsPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground">Manage your software products.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Product management features are scheduled for Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  )
}
