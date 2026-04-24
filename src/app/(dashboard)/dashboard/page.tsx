import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users, Home, Cake, Clock } from "lucide-react"

const stats = [
  {
    title: "Total Families",
    value: "0",
    description: "Registered families",
    icon: Home,
  },
  {
    title: "Active Members",
    value: "0",
    description: "Currently active",
    icon: Users,
  },
  {
    title: "Upcoming Birthdays",
    value: "0",
    description: "This month",
    icon: Cake,
  },
  {
    title: "Pending Dispatches",
    value: "0",
    description: "In queue",
    icon: Clock,
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to CCISR Connect
        </h1>
        <p className="text-muted-foreground">
          Church membership management and communication platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.title}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
          <CardDescription>
            Upcoming events and activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No upcoming events scheduled. Use the Calendar to add events or
            Compose to send communications to your congregation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
