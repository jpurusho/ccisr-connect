"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Settings, Palette, Server, UserCog, Info, Church, Tag, Activity, Database, Plug, Clock, Mail, History } from "lucide-react"
import dynamic from "next/dynamic"
const ActivityLogPanel = dynamic(() => import("@/components/settings/activity-log-panel"), { ssr: false })
const DispatchPanel = dynamic(() => import("@/app/(dashboard)/dispatch/page"), { ssr: false })
const MailingListsPanel = dynamic(() => import("@/app/(dashboard)/mailing-lists/page"), { ssr: false })
const HistoryPanel = dynamic(() => import("@/app/(dashboard)/history/page"), { ssr: false })
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { SmtpConfigPanel } from "@/components/settings/smtp-config"
import { UserManagementPanel } from "@/components/settings/user-management"
import { TagManagementPanel } from "@/components/settings/tag-management"
import { DatabaseStatsPanel } from "@/components/settings/database-stats-panel"
import { IntegrationsPanel } from "@/components/settings/integrations-panel"
import { useAppUser } from "@/hooks/use-app-user"

import { APP_VERSION } from "@/lib/version"

function AboutPanel() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Application information and credits.
      </p>

      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Church className="size-8 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">CCISR Connect</CardTitle>
          <CardDescription>
            Church Membership Management & Communication Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Badge variant="secondary" className="text-sm">
              v{APP_VERSION}
            </Badge>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            Church Membership Management & Communication Platform for Christ
            Church of India, San Ramon
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Built with</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Next.js</Badge>
              <Badge variant="outline">Supabase</Badge>
              <Badge variant="outline">Tailwind CSS</Badge>
              <Badge variant="outline">shadcn/ui</Badge>
              <Badge variant="outline">Vercel</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageInner />
    </Suspense>
  )
}

function SettingsPageInner() {
  const { appUser, loading } = useAppUser()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") || "themes"
  const isAdmin = appUser?.role === "admin" || appUser?.role === "super_admin"
  const isSuperAdmin = appUser?.role === "super_admin"

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application preferences, email configuration, and users.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue={initialTab}>
          <TabsList
            variant="line"
            className="w-full justify-start overflow-x-auto scrollbar-none"
          >
            <TabsTrigger value="themes">
              <Palette className="size-4" />
              <span className="hidden sm:inline">Themes</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="email">
                <Server className="size-4" />
                <span className="hidden sm:inline">SMTP</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="mailing-lists">
                <Mail className="size-4" />
                <span className="hidden sm:inline">Mailing Lists</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="dispatch">
                <Clock className="size-4" />
                <span className="hidden sm:inline">Dispatch Queue</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="history">
                <History className="size-4" />
                <span className="hidden sm:inline">Email History</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users">
                <UserCog className="size-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="tags">
              <Tag className="size-4" />
              <span className="hidden sm:inline">Tags</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="integrations">
                <Plug className="size-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="activity">
              <Activity className="size-4" />
              <span className="hidden sm:inline">Activity Log</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="database">
                <Database className="size-4" />
                <span className="hidden sm:inline">Database</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="about">
              <Info className="size-4" />
              <span className="hidden sm:inline">About</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="mt-6">
            <ThemeSelector />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="email" className="mt-6">
              <SmtpConfigPanel />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="mailing-lists" className="mt-6">
              <MailingListsPanel />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="dispatch" className="mt-6">
              <DispatchPanel />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="history" className="mt-6">
              <HistoryPanel />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="users" className="mt-6">
              <UserManagementPanel />
            </TabsContent>
          )}

          <TabsContent value="tags" className="mt-6">
            <TagManagementPanel />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="integrations" className="mt-6">
              <IntegrationsPanel />
            </TabsContent>
          )}

          <TabsContent value="activity" className="mt-6">
            <ActivityLogPanel />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="database" className="mt-6">
              <DatabaseStatsPanel />
            </TabsContent>
          )}

          <TabsContent value="about" className="mt-6">
            <AboutPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
