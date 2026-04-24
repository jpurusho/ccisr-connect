"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
} from "@/lib/email/card-builder";
import { Cake, Heart, BookOpen, Users, HandHelping, Newspaper, Eye, Send } from "lucide-react";

const SAMPLE_CARDS = [
  {
    id: "birthday",
    label: "Birthdays",
    icon: Cake,
    color: "#7C3AED",
    html: buildBirthdayCard({
      weekLabel: "April 27 – May 3",
      birthdays: [
        { name: "Joshua Ravikumar", date: "4/29" },
        { name: "Priyadharsini Kingsly", date: "5/1" },
        { name: "Ramesh Durairaj", date: "5/1" },
      ],
    }),
  },
  {
    id: "anniversary",
    label: "Anniversaries",
    icon: Heart,
    color: "#D97706",
    html: buildAnniversaryCard({
      weekLabel: "April 27 – May 3",
      anniversaries: [
        { husbandName: "Prabin", wifeName: "Divya", date: "4/27", years: 15 },
        { husbandName: "Christudass", wifeName: "Reenie", date: "4/30" },
      ],
    }),
  },
  {
    id: "bible_study",
    label: "Bible Study",
    icon: BookOpen,
    color: "#0D9488",
    html: buildBibleStudyCard({
      hostNames: "Jerome & Sunitha",
      address: "2652 Piccadilly Circle",
      city: "San Ramon, CA 94582",
      phone: "510-676-2224",
      date: "Friday, May 2nd",
      time: "7:30 PM",
      topic: "Studying the Book of Acts",
    }),
  },
  {
    id: "womens_study",
    label: "Women's Study",
    icon: Users,
    color: "#DB2777",
    html: buildWomensStudyCard({
      topic: "Building a Relationship with God",
      date: "Wednesday, May 7th",
      time: "7:00 PM",
      zoomLink: "https://zoom.us/j/example",
    }),
  },
  {
    id: "prayer_meeting",
    label: "Prayer Meeting",
    icon: HandHelping,
    color: "#059669",
    html: buildPrayerMeetingCard({
      hostNames: "John & Anita",
      address: "3607 McCormick Ct",
      city: "Dublin, CA 94568",
      phone: "650-766-4669",
      date: "Saturday, May 2nd",
      time: "6:30 PM",
      dinnerNote: "Dinner provided by the host family",
      signupLink: "https://forms.google.com/example",
    }),
  },
  {
    id: "bulletin",
    label: "Bulletin",
    icon: Newspaper,
    color: "#4F46E5",
    html: buildBulletinCard({
      weekLabel: "Week of April 27 – May 3, 2026",
      birthdays: [
        { name: "Joshua Ravikumar", date: "4/29" },
        { name: "Priyadharsini Kingsly", date: "5/1" },
        { name: "Ramesh Durairaj", date: "5/1" },
      ],
      anniversaries: [
        { names: "Prabin & Divya", date: "4/27" },
        { names: "Christudass & Reenie", date: "4/30" },
      ],
      helpers: [
        { role: "Communion helper for May", name: "Sheela Thangaraj" },
        { role: "Snack helper for May", name: "Tryphena" },
      ],
      events: [
        {
          title: "Women's Bible Study",
          details: "Building a Relationship with God — Wednesdays @ 7:00 PM via Zoom",
        },
        {
          title: "San Ramon Bible Study",
          details: "Studying the Book of Acts — Friday at 7:30 PM @ Ephraim & Josephine",
        },
      ],
    }),
  },
];

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState("birthday");

  const activeCard = SAMPLE_CARDS.find((c) => c.id === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
        <p className="text-muted-foreground">
          Preview and manage card templates for different event types.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {SAMPLE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <TabsTrigger
                key={card.id}
                value={card.id}
                className="gap-1.5 data-[state=active]:text-white"
                style={
                  activeTab === card.id
                    ? { backgroundColor: card.color }
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {card.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SAMPLE_CARDS.map((card) => (
          <TabsContent key={card.id} value={card.id}>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Card Preview */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{card.label} Card Preview</CardTitle>
                    <CardDescription>
                      This is how the card will appear in email clients and
                      when shared.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `/api/cards/preview?type=${card.id}`,
                          "_blank"
                        )
                      }
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Full Preview
                    </Button>
                    <Button size="sm" style={{ backgroundColor: card.color }}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Send
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="rounded-lg border bg-slate-50 p-6 dark:bg-slate-900"
                    dangerouslySetInnerHTML={{ __html: card.html }}
                  />
                </CardContent>
              </Card>

              {/* Card Info Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Color Scheme</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <div
                        className="h-8 w-8 rounded-md border"
                        style={{ backgroundColor: card.color }}
                        title="Primary"
                      />
                      <div
                        className="h-8 w-8 rounded-md border"
                        style={{
                          backgroundColor:
                            card.id === "birthday"
                              ? "#EDE9FE"
                              : card.id === "anniversary"
                                ? "#FEF3C7"
                                : card.id === "bible_study"
                                  ? "#CCFBF1"
                                  : card.id === "womens_study"
                                    ? "#FCE7F3"
                                    : card.id === "prayer_meeting"
                                      ? "#D1FAE5"
                                      : "#EEF2FF",
                        }}
                        title="Light"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Template Variables</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {card.id === "birthday" && (
                      <ul className="list-disc pl-4 space-y-1">
                        <li>{"{{week_label}}"}</li>
                        <li>{"{{birthdays[].name}}"}</li>
                        <li>{"{{birthdays[].date}}"}</li>
                        <li>{"{{message}}"}</li>
                      </ul>
                    )}
                    {card.id === "anniversary" && (
                      <ul className="list-disc pl-4 space-y-1">
                        <li>{"{{week_label}}"}</li>
                        <li>{"{{anniversaries[].husband}}"}</li>
                        <li>{"{{anniversaries[].wife}}"}</li>
                        <li>{"{{anniversaries[].date}}"}</li>
                        <li>{"{{anniversaries[].years}}"}</li>
                      </ul>
                    )}
                    {(card.id === "bible_study" ||
                      card.id === "prayer_meeting") && (
                      <ul className="list-disc pl-4 space-y-1">
                        <li>{"{{host_names}}"}</li>
                        <li>{"{{address}}"}</li>
                        <li>{"{{phone}}"}</li>
                        <li>{"{{date}}"}</li>
                        <li>{"{{time}}"}</li>
                        <li>{"{{topic}}"}</li>
                      </ul>
                    )}
                    {card.id === "womens_study" && (
                      <ul className="list-disc pl-4 space-y-1">
                        <li>{"{{topic}}"}</li>
                        <li>{"{{date}}"}</li>
                        <li>{"{{time}}"}</li>
                        <li>{"{{zoom_link}}"}</li>
                      </ul>
                    )}
                    {card.id === "bulletin" && (
                      <ul className="list-disc pl-4 space-y-1">
                        <li>{"{{week_label}}"}</li>
                        <li>{"{{birthdays[]}}"}</li>
                        <li>{"{{anniversaries[]}}"}</li>
                        <li>{"{{helpers[]}}"}</li>
                        <li>{"{{events[]}}"}</li>
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                      Cards are rendered as email-safe HTML using table-based
                      layout for maximum compatibility with Gmail, Outlook,
                      Apple Mail, and mobile clients.
                    </p>
                    <p>
                      Click <strong>Full Preview</strong> to see exactly how
                      the card renders in a browser, or{" "}
                      <strong>Send</strong> to compose an email with this
                      template.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
