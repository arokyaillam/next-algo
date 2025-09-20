'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { useAuth } from '@/components/AuthProvider'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    निफ्टी Options Pro
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Nifty 50 Overview Cards */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">NIFTY 50</h3>
              <div className="text-2xl font-bold text-green-600 dark:text-green-500">24,127.85</div>
              <div className="text-sm text-green-600 dark:text-green-500">+156.42 (+0.65%)</div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Options Chain</h3>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">Live</div>
              <div className="text-sm text-muted-foreground">Real-time data</div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Portfolio</h3>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-500">₹0.00</div>
              <div className="text-sm text-muted-foreground">P&L</div>
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="bg-card border border-border rounded-xl flex-1 p-6 shadow-sm min-h-[60vh]">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-foreground">Welcome to Options Trading</h2>
              <p className="text-muted-foreground">
                Welcome, {user.email}! Start analyzing Nifty 50 options data.
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border border-dashed border-border rounded-lg p-6 text-center hover:bg-accent/50 transition-colors">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-medium mb-2 text-foreground">Options Chain</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  View live Nifty 50 options chain data
                </p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors">
                  View Chain
                </button>
              </div>
              
              <div className="border border-dashed border-border rounded-lg p-6 text-center hover:bg-accent/50 transition-colors">
                <div className="text-2xl mb-2">📈</div>
                <h3 className="font-medium mb-2 text-foreground">Analytics</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Options analytics and insights
                </p>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors">
                  View Analytics
                </button>
              </div>
              
              <div className="border border-dashed border-border rounded-lg p-6 text-center hover:bg-accent/50 transition-colors">
                <div className="text-2xl mb-2">💼</div>
                <h3 className="font-medium mb-2 text-foreground">Portfolio</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your positions
                </p>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition-colors">
                  View Portfolio
                </button>
              </div>
            </div>
            
            {/* Status Info */}
            <div className="mt-8 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">System Ready</h3>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                    Authentication system active. Supabase connected. Ready for trading data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}