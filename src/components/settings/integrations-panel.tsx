"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { BookOpen, Save, Loader2, CheckCircle } from "lucide-react"

interface Setting {
  key: string
  value: string
}

export function IntegrationsPanel() {
  const [esvKey, setEsvKey] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["esv_api_key"])
        .returns<Setting[]>()

      if (data) {
        for (const s of data) {
          if (s.key === "esv_api_key") setEsvKey(s.value || "")
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "esv_api_key", value: esvKey.trim(), updated_at: new Date().toISOString() } as never)

    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success("API key saved")
    }
    setSaving(false)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/bible?ref=John+3:16&translation=esv")
      if (res.ok) {
        const data = await res.json()
        setTestResult(data.text?.slice(0, 80) + "...")
      } else {
        setTestResult("Failed — check your API key")
      }
    } catch {
      setTestResult("Failed — network error")
    }
    setTesting(false)
  }

  if (loading) {
    return <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-5" />
            Bible Verse API (ESV)
          </CardTitle>
          <CardDescription>
            Get a free API key from <a href="https://api.esv.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">api.esv.org</a>.
            Used for verse lookup in templates and signup forms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">API Token</Label>
            <Input
              type="password"
              value={esvKey}
              onChange={(e) => setEsvKey(e.target.value)}
              placeholder="Enter your ESV API token"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !esvKey.trim()}>
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
              Test
            </Button>
          </div>
          {testResult && (
            <p className={`text-xs ${testResult.startsWith("Failed") ? "text-red-500" : "text-emerald-600"}`}>
              {testResult}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Without this key, verse lookup falls back to the World English Bible (WEB) translation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
