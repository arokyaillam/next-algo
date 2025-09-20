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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { useAuth } from '@/components/AuthProvider'
import { BrokerConnectionCard } from '@/components/BrokerConnection'

export default function SettingsPage() {
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
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account settings and broker connections
              </p>
            </div>

            <Tabs defaultValue="broker" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="broker">Broker</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="broker" className="space-y-6">
                <div className="grid gap-6">
                  <BrokerConnectionCard />
                  
                  {/* API Usage Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>API Usage</CardTitle>
                      <CardDescription>
                        Monitor your broker API usage and limits
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">245</div>
                          <div className="text-sm text-muted-foreground">API Calls Today</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">98.2%</div>
                          <div className="text-sm text-muted-foreground">Success Rate</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">2,755</div>
                          <div className="text-sm text-muted-foreground">Remaining Calls</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information and trading preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Email</label>
                          <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                            {user.email}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">User ID</label>
                          <div className="mt-1 p-3 bg-muted rounded-md text-sm font-mono">
                            {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Configure alerts and notifications for your trading activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-4xl mb-2">🔔</div>
                      <p className="text-sm">Notification settings coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security and authentication
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">Two-Factor Authentication</div>
                          <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                        </div>
                        <div className="px-3 py-1 bg-muted rounded text-sm">
                          Coming Soon
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">API Access Logs</div>
                          <div className="text-sm text-muted-foreground">View recent broker API activity</div>
                        </div>
                        <div className="px-3 py-1 bg-muted rounded text-sm">
                          Available
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}