"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Mail, History, FileText } from "lucide-react"
import dynamic from "next/dynamic"

const DispatchPanel = dynamic(() => import("@/app/(dashboard)/dispatch/page"), { ssr: false })
const MailingListsPanel = dynamic(() => import("@/app/(dashboard)/mailing-lists/page"), { ssr: false })
const HistoryPanel = dynamic(() => import("@/app/(dashboard)/history/page"), { ssr: false })
const TemplatesPanel = dynamic(() => import("@/app/(dashboard)/templates/page"), { ssr: false })

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState("dispatch")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email</h1>
        <p className="text-sm text-muted-foreground">
          Dispatch, manage templates, and review email history.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto scrollbar-none">
          <TabsTrigger value="dispatch">
            <Clock className="size-4" />
            <span className="hidden sm:inline">Dispatch Queue</span>
          </TabsTrigger>
          <TabsTrigger value="mailing-lists">
            <Mail className="size-4" />
            <span className="hidden sm:inline">Mailing Lists</span>
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="size-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="size-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch" className="mt-6">
          <DispatchPanel />
        </TabsContent>
        <TabsContent value="mailing-lists" className="mt-6">
          <MailingListsPanel />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesPanel />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
