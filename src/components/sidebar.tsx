'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Shield, 
  Key, 
  Users, 
  Monitor,
  ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Policies', href: '/policies', icon: Shield },
  { name: 'Licenses', href: '/licenses', icon: Key },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Machines', href: '/machines', icon: Monitor },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card hidden md:flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span>Keygen Admin</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
