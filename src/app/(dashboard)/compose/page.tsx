"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
  EVENT_COLORS,
} from "@/lib/email/card-builder"
import { Send, Cake, Heart, BookOpen, Users, HandHelping, Newspaper } from "lucide-react"

const TEMPLATES = [
  {
    id: "birthday",
    title: "Birthday Card",
    description: "Send birthday greetings for this week",
    icon: Cake,
    color: EVENT_COLORS.birthday.primary,
  },
  {
    id: "anniversary",
    title: "Anniversary Card",
    description: "Send anniversary wishes for this week",
    icon: Heart,
    color: EVENT_COLORS.anniversary.primary,
  },
  {
    id: "bible_study",
    title: "Bible Study Invite",
    description: "Friday Bible study invitation",
    icon: BookOpen,
    color: EVENT_COLORS.friday_bible_study.primary,
  },
  {
    id: "womens_study",
    title: "Women's Bible Study",
    description: "Wednesday women's study notice",
    icon: Users,
    color: EVENT_COLORS.wednesday_womens_study.primary,
  },
  {
    id: "prayer_meeting",
    title: "Prayer Meeting",
    description: "Monthly prayer meeting invitation",
    icon: HandHelping,
    color: EVENT_COLORS.monthly_prayer.primary,
  },
  {
    id: "bulletin",
    title: "Weekly Bulletin",
    description: "Compile and send the weekly bulletin",
    icon: Newspaper,
    color: EVENT_COLORS.bulletin.primary,
  },
]

export default function ComposePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  function handleSelect(templateId: string) {
    setSelectedTemplate(templateId)

    let html = ""
    switch (templateId) {
      case "birthday":
        html = buildBirthdayCard({
          weekLabel: "This Week",
          birthdays: [{ name: "Sample Member", date: "4/29" }],
        })
        break
      case "anniversary":
        html = buildAnniversaryCard({
          weekLabel: "This Week",
          anniversaries: [{ husbandName: "John", wifeName: "Jane", date: "4/27" }],
        })
        break
      case "bible_study":
        html = buildBibleStudyCard({
          hostNames: "Host Family",
          address: "123 Main St",
          city: "San Ramon, CA",
          date: "This Friday",
          time: "7:30 PM",
          topic: "Book of Acts",
        })
        break
      case "womens_study":
        html = buildWomensStudyCard({
          topic: "Building a Relationship with God",
          date: "This Wednesday",
          time: "7:00 PM",
        })
        break
      case "prayer_meeting":
        html = buildPrayerMeetingCard({
          hostNames: "Host Family",
          address: "123 Main St",
          city: "Dublin, CA",
          date: "This Saturday",
          time: "6:30 PM",
          dinnerNote: "Dinner provided by the host family",
        })
        break
      case "bulletin":
        html = buildBulletinCard({
          weekLabel: "This Week",
          birthdays: [],
          anniversaries: [],
          helpers: [],
          events: [],
        })
        break
    }
    setPreviewHtml(html)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compose</h1>
        <p className="text-muted-foreground">
          Choose a template to compose and send an email.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon
          const isSelected = selectedTemplate === tmpl.id
          return (
            <Card
              key={tmpl.id}
              className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2" : ""}`}
              style={isSelected ? { borderColor: tmpl.color, boxShadow: `0 0 0 1px ${tmpl.color}` } : {}}
              onClick={() => handleSelect(tmpl.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: tmpl.color + "15", color: tmpl.color }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tmpl.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {tmpl.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {previewHtml && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                This is a sample preview. In the full compose flow, data will be
                auto-populated from the database.
              </CardDescription>
            </div>
            <Button
              style={{
                backgroundColor:
                  TEMPLATES.find((t) => t.id === selectedTemplate)?.color,
              }}
            >
              <Send className="size-4" />
              Send
            </Button>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg border bg-slate-50 p-6 dark:bg-slate-900"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
