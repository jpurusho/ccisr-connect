import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DynamicBreadcrumb } from "@/components/layout/dynamic-breadcrumb"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { CommandPalette } from "@/components/layout/command-palette"
import { Toaster } from "@/components/ui/sonner"
import { AppUserProvider } from "@/hooks/use-app-user"
import { BreadcrumbProvider } from "@/components/layout/breadcrumb-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BreadcrumbProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        {/* Top safe area spacer for iOS notch/status bar */}
        <div className="safe-top bg-background border-b" />

        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <DynamicBreadcrumb />
          <div className="ml-auto flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
              <span className="text-xs">⌘</span>K
            </kbd>
            <ThemeToggle />
          </div>
        </header>

        <AppUserProvider>
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </div>
        </AppUserProvider>

        {/* Bottom safe area spacer for iOS home indicator */}
        <div className="safe-bottom bg-background" />
      </SidebarInset>
      <CommandPalette />
      <Toaster />
    </SidebarProvider>
    </BreadcrumbProvider>
  )
}
