'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Monitor } from 'lucide-react'

export default function MachinesPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Machines</h1>
        <p className="text-muted-foreground">Manage activated devices.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" /> Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Machine management features are scheduled for Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  )
}
