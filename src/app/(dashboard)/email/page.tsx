import { redirect } from "next/navigation"

export default function EmailPage() {
  redirect("/settings?tab=dispatch")
}
