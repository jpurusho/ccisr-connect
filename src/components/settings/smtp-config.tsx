"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { SmtpConfig } from "@/types/database"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Server, Mail, Loader2, Trash2, Eye, EyeOff } from "lucide-react"

export function SmtpConfigPanel() {
  const [configs, setConfigs] = useState<SmtpConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SmtpConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [host, setHost] = useState("")
  const [port, setPort] = useState("587")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fromName, setFromName] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [isAdminOnly, setIsAdminOnly] = useState(false)

  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("smtp_configs")
      .select("*")
      .order("created_at", { ascending: true })
    if (data) setConfigs(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  function openDialog(config?: SmtpConfig) {
    if (config) {
      setEditingConfig(config)
      setName(config.name)
      setHost(config.host)
      setPort(String(config.port))
      setUsername(config.username)
      setPassword("")
      setFromName(config.from_name)
      setFromEmail(config.from_email)
      setIsAdminOnly(config.is_admin_only)
    } else {
      setEditingConfig(null)
      setName("")
      setHost("smtp.gmail.com")
      setPort("587")
      setUsername("")
      setPassword("")
      setFromName("")
      setFromEmail("")
      setIsAdminOnly(false)
    }
    setShowPassword(false)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !host.trim() || !username.trim() || !fromEmail.trim()) {
      toast.error("Please fill in all required fields")
      return
    }
    if (!editingConfig && !password) {
      toast.error("Password is required for new SMTP configs")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      const payload: Record<string, unknown> = {
        name: name.trim(),
        host: host.trim(),
        port: parseInt(port),
        username: username.trim(),
        from_name: fromName.trim() || name.trim(),
        from_email: fromEmail.trim(),
        is_admin_only: isAdminOnly,
        is_active: true,
      }

      if (password) {
        payload.encrypted_password = password
      }

      if (editingConfig) {
        const { error } = await supabase
          .from("smtp_configs")
          .update(payload as never)
          .eq("id", editingConfig.id)
        if (error) {
          toast.error(`Update failed: ${error.message}`)
          return
        }
        toast.success("SMTP config updated")
      } else {
        payload.encrypted_password = password
        const { error } = await supabase
          .from("smtp_configs")
          .insert(payload as never)
        if (error) {
          toast.error(`Create failed: ${error.message}`)
          return
        }
        toast.success("SMTP config created")
      }

      setDialogOpen(false)
      fetchConfigs()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(config: SmtpConfig) {
    const supabase = createClient()
    const { error } = await supabase
      .from("smtp_configs")
      .update({ is_active: !config.is_active } as never)
      .eq("id", config.id)

    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success(`${config.name} ${config.is_active ? "disabled" : "enabled"}`)
      fetchConfigs()
    }
  }

  async function deleteConfig(config: SmtpConfig) {
    if (!confirm(`Delete SMTP config "${config.name}"? This cannot be undone.`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from("smtp_configs")
      .delete()
      .eq("id", config.id)

    if (error) {
      toast.error(`Delete failed: ${error.message}`)
    } else {
      toast.success(`${config.name} deleted`)
      fetchConfigs()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground">
            Configure email accounts for sending communications.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="size-4" />
          Add SMTP Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-5" />
            Email Accounts
          </CardTitle>
          <CardDescription>
            {configs.length} account{configs.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No SMTP accounts configured yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a Gmail or other SMTP account to start sending emails.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Server</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead className="hidden md:table-cell">Access</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {config.host}:{config.port}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{config.from_name}</p>
                        <p className="text-xs text-muted-foreground">{config.from_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {config.is_admin_only ? (
                        <Badge variant="outline">Admin Only</Badge>
                      ) : (
                        <Badge variant="secondary">All Users</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={() => toggleActive(config)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDialog(config)}
                        >
                          <Server className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteConfig(config)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gmail SMTP Quick Setup</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>To use Gmail as your SMTP provider:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Go to your Google Account → Security → 2-Step Verification (enable if not already)</li>
            <li>Search for "App passwords" in Google Account settings</li>
            <li>Generate an app password for "Mail"</li>
            <li>Use <code className="bg-muted px-1 rounded">smtp.gmail.com</code> as host, port <code className="bg-muted px-1 rounded">587</code></li>
            <li>Username is your full Gmail address, password is the app password</li>
          </ol>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit SMTP Config" : "Add SMTP Account"}
            </DialogTitle>
            <DialogDescription>
              Configure an email server for sending communications.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="smtpName">Account Name *</Label>
              <Input
                id="smtpName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Church Office Gmail"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="smtpHost">SMTP Host *</Label>
                <Input
                  id="smtpHost"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtpPort">Port *</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="587"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="smtpUser">Username *</Label>
                <Input
                  id="smtpUser"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="email@gmail.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtpPass">
                  Password {editingConfig ? "(leave blank to keep)" : "*"}
                </Label>
                <div className="relative">
                  <Input
                    id="smtpPass"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingConfig ? "••••••••" : "App password"}
                    required={!editingConfig}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="CCISR Connect"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fromEmail">From Email *</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="church@gmail.com"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="adminOnly">Admin Only</Label>
                <p className="text-xs text-muted-foreground">
                  Only admins can use this account to send emails
                </p>
              </div>
              <Switch
                id="adminOnly"
                checked={isAdminOnly}
                onCheckedChange={(checked) => setIsAdminOnly(checked)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {editingConfig ? "Save Changes" : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
