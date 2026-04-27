"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logAudit } from "@/lib/audit"
import type { AppUser, UserRole } from "@/types/database"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
import { Plus, UserCog, Shield, ShieldCheck, User, Loader2, Check, Minus } from "lucide-react"
import { useAppUser } from "@/hooks/use-app-user"

type PermValue = true | false | "read-only"

const ROLE_PERMISSIONS: { feature: string; super_admin: PermValue; admin: PermValue; operator: PermValue }[] = [
  { feature: "Members — view, create, edit, delete", super_admin: true, admin: true, operator: true },
  { feature: "Events — view, create, edit, delete",  super_admin: true, admin: true, operator: true },
  { feature: "Event Types — manage",                 super_admin: true, admin: true, operator: "read-only" },
  { feature: "Email Templates — full CRUD",          super_admin: true, admin: true, operator: true },
  { feature: "Mailing Lists — full CRUD",            super_admin: true, admin: true, operator: true },
  { feature: "Dispatch — create & send",             super_admin: true, admin: true, operator: true },
  { feature: "Dispatch History — view",              super_admin: true, admin: true, operator: "read-only" },
  { feature: "SMTP Configs — manage",                super_admin: true, admin: true, operator: "read-only" },
  { feature: "Audit Log — view",                     super_admin: true, admin: true, operator: "read-only" },
  { feature: "User Management — view/edit/deactivate", super_admin: true, admin: true, operator: false },
  { feature: "Invite Users — create new accounts",   super_admin: true, admin: false, operator: false },
]

function PermCell({ value }: { value: PermValue }) {
  if (value === true)
    return <Check className="mx-auto size-4 text-green-600" />
  if (value === false)
    return <Minus className="mx-auto size-4 text-muted-foreground/40" />
  return <span className="text-xs text-muted-foreground">read-only</span>
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Shield; color: string }> = {
  super_admin: { label: "Super Admin", icon: ShieldCheck, color: "text-red-600" },
  admin: { label: "Admin", icon: Shield, color: "text-amber-600" },
  operator: { label: "Operator", icon: User, color: "text-blue-600" },
}

export function UserManagementPanel() {
  const { appUser: currentUser } = useAppUser()
  const isSuperAdmin = currentUser?.role === "super_admin"
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin"

  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteDisplayName, setInviteDisplayName] = useState("")
  const [inviteRole, setInviteRole] = useState<UserRole>("operator")

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: true })
    if (data) setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error("Email is required")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const token = (await supabase.auth.getSession()).data.session?.access_token

      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          display_name: inviteDisplayName.trim() || null,
          role: inviteRole,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(`Failed to invite user: ${err.error || "Unknown error"}`)
        setSaving(false)
        return
      }

      toast.success(`User ${inviteEmail.trim()} invited as ${inviteRole}`)
      logAudit("user_invited", "app_users", null, { email: inviteEmail.trim(), role: inviteRole })
      setDialogOpen(false)
      setInviteEmail("")
      setInviteDisplayName("")
      setInviteRole("operator")
      fetchUsers()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(user: AppUser) {
    const supabase = createClient()
    const { error } = await supabase
      .from("app_users")
      .update({ is_active: !user.is_active } as never)
      .eq("id", user.id)

    if (error) {
      toast.error(`Failed to update: ${error.message}`)
    } else {
      toast.success(`${user.email} ${user.is_active ? "deactivated" : "activated"}`)
      logAudit("user_toggled_active", "app_users", user.id, { is_active: !user.is_active })
      fetchUsers()
    }
  }

  async function updateRole(user: AppUser, newRole: UserRole) {
    const supabase = createClient()
    const { error } = await supabase
      .from("app_users")
      .update({ role: newRole } as never)
      .eq("id", user.id)

    if (error) {
      toast.error(`Failed to update role: ${error.message}`)
    } else {
      toast.success(`${user.email} role updated to ${newRole}`)
      logAudit("user_role_changed", "app_users", user.id, { role: newRole })
      fetchUsers()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground">
            Manage who can access CCISR Connect and their permissions.
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Invite User
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="size-5" />
            App Users
          </CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Last Login</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role]
                  const RoleIcon = roleConfig.icon
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.display_name || user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(val) => updateRole(user, val as UserRole)}
                          disabled={!isAdmin}
                        >
                          <SelectTrigger className="w-36">
                            <div className="flex items-center gap-1.5">
                              <RoleIcon className={`size-3.5 ${roleConfig.color}`} />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="operator">Operator</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => toggleActive(user)}
                          disabled={!isAdmin}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>What each role can do in CCISR Connect</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">Feature</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <ShieldCheck className="size-3.5 text-red-600" /> Super Admin
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Shield className="size-3.5 text-amber-600" /> Admin
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <User className="size-3.5 text-blue-600" /> Operator
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLE_PERMISSIONS.map(({ feature, super_admin, admin, operator }) => (
                <TableRow key={feature}>
                  <TableCell className="text-sm font-medium">{feature}</TableCell>
                  <TableCell className="text-center"><PermCell value={super_admin} /></TableCell>
                  <TableCell className="text-center"><PermCell value={admin} /></TableCell>
                  <TableCell className="text-center"><PermCell value={operator} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isSuperAdmin && dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Add a new user to CCISR Connect. They will be able to sign in with their Google account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@gmail.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={inviteDisplayName}
                onChange={(e) => setInviteDisplayName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val as UserRole)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin — full access</SelectItem>
                  <SelectItem value="admin">Admin — manage users & config</SelectItem>
                  <SelectItem value="operator">Operator — manage members & send emails</SelectItem>
                </SelectContent>
              </Select>
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
                Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
