'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  ShieldCheck, 
  Key, 
  Users, 
  Laptop, 
  Menu, 
  X, 
  LogOut,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function truncateAccountId(accountId: string): string {
  if (accountId.length <= 14) return accountId
  return `${accountId.slice(0, 8)}...${accountId.slice(-6)}`
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Policies', href: '/policies', icon: ShieldCheck },
  { name: 'Licenses', href: '/licenses', icon: Key },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Machines', href: '/machines', icon: Laptop },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { logout, accountId, baseUrl } = useAuth()

  const currentPage = navigation.find((item) => pathname.startsWith(item.href))?.name || 'Dashboard'

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <Key className="w-5 h-5" />
              </div>
              <span>Keygen</span>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto w-4 h-4 opacity-50" />}
                </Link>
              )
            })}
          </nav>

          {/* Footer / User area */}
          <div className="p-4 border-t space-y-3">
            {/* Account Info */}
            {accountId && (
              <TooltipProvider>
                <div className="px-3 py-2 rounded-md bg-accent/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm font-mono text-foreground cursor-default">
                          {truncateAccountId(accountId)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-mono">{accountId}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {extractHostname(baseUrl)}
                  </p>
                </div>
              </TooltipProvider>
            )}

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 bg-card border-b sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-4 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-semibold truncate">{currentPage}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* User profile placeholder */}
            <div className="w-8 h-8 rounded-full bg-accent animate-pulse" />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
