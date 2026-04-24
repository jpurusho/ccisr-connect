import { NextRequest, NextResponse } from "next/server";
import {
  buildBirthdayCard,
  buildAnniversaryCard,
  buildBibleStudyCard,
  buildWomensStudyCard,
  buildPrayerMeetingCard,
  buildBulletinCard,
} from "@/lib/email/card-builder";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "birthday";

  let html = "";

  switch (type) {
    case "birthday":
      html = buildBirthdayCard({
        weekLabel: searchParams.get("week") || "April 27 – May 3",
        birthdays: [
          { name: "Joshua Ravikumar", date: "4/29" },
          { name: "Priyadharsini Kingsly", date: "5/1" },
          { name: "Ramesh Durairaj", date: "5/1" },
        ],
      });
      break;

    case "anniversary":
      html = buildAnniversaryCard({
        weekLabel: searchParams.get("week") || "April 27 – May 3",
        anniversaries: [
          { husbandName: "Prabin", wifeName: "Divya", date: "4/27", years: 15 },
          { husbandName: "Christudass", wifeName: "Reenie", date: "4/30" },
        ],
      });
      break;

    case "bible_study":
      html = buildBibleStudyCard({
        hostNames: searchParams.get("host") || "Jerome & Sunitha",
        address:
          searchParams.get("address") ||
          "2652 Piccadilly Circle",
        city: "San Ramon, CA 94582",
        phone: searchParams.get("phone") || "510-676-2224",
        date: searchParams.get("date") || "Friday, May 2nd",
        time: searchParams.get("time") || "7:30 PM",
        topic: searchParams.get("topic") || "Studying the Book of Acts",
      });
      break;

    case "womens_study":
      html = buildWomensStudyCard({
        topic:
          searchParams.get("topic") ||
          "Building a Relationship with God",
        date: searchParams.get("date") || "Wednesday, May 7th",
        time: searchParams.get("time") || "7:00 PM",
        zoomLink: searchParams.get("zoom") || "https://zoom.us/j/example",
      });
      break;

    case "prayer_meeting":
      html = buildPrayerMeetingCard({
        hostNames: searchParams.get("host") || "John & Anita",
        address:
          searchParams.get("address") || "3607 McCormick Ct",
        city: "Dublin, CA 94568",
        phone: searchParams.get("phone") || "650-766-4669",
        date: searchParams.get("date") || "Saturday, May 2nd",
        time: searchParams.get("time") || "6:30 PM",
        dinnerNote:
          searchParams.get("dinner") || "Dinner provided by the host family",
        signupLink: searchParams.get("signup") || undefined,
      });
      break;

    case "bulletin":
      html = buildBulletinCard({
        weekLabel:
          searchParams.get("week") || "Week of April 27 – May 3, 2026",
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
            details:
              "Building a Relationship with God — Wednesdays @ 7:00 PM via Zoom",
          },
          {
            title: "San Ramon Bible Study",
            details:
              "Studying the Book of Acts — Friday at 7:30 PM @ Ephraim & Josephine",
          },
        ],
      });
      break;

    default:
      return NextResponse.json({ error: "Unknown card type" }, { status: 400 });
  }

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Card Preview — ${type}</title>
<style>body{margin:0;padding:40px 16px;background:#f1f5f9;min-height:100vh}</style>
</head>
<body>${html}</body>
</html>`;

  return new NextResponse(fullHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
