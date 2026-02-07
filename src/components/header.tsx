'use client'

import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { LogOut, Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/policies': 'Policies',
  '/licenses': 'Licenses',
  '/users': 'Users',
  '/machines': 'Machines',
}

export function Header() {
  const { logout, accountId } = useAuth()
  const pathname = usePathname()
  
  // Try to find the title by matching the start of the path
  const titleKey = Object.keys(pageTitles).find(key => 
    key === '/' ? pathname === '/' : pathname.startsWith(key)
  )
  const title = titleKey ? pageTitles[titleKey] : 'Dashboard'

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:inline-block">
          Account: {accountId}
        </span>
        <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
