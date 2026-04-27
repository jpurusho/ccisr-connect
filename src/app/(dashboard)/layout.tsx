import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DynamicBreadcrumb } from "@/components/layout/dynamic-breadcrumb"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Toaster } from "@/components/ui/sonner"
import { AppUserProvider } from "@/hooks/use-app-user"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <DynamicBreadcrumb />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <AppUserProvider>
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </div>
        </AppUserProvider>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
