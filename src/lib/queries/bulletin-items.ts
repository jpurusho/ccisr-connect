import { createClient } from "@/lib/supabase/client"

export interface BulletinItem {
  id: string
  title: string
  details: string | null
  sort_order: number
  is_recurring: boolean
  week_start: string | null
  is_active: boolean
  created_at: string
}

export async function getBulletinItems(weekStart?: string): Promise<BulletinItem[]> {
  const supabase = createClient()
  let query = supabase
    .from("bulletin_items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")

  if (weekStart) {
    query = query.or(`is_recurring.eq.true,week_start.eq.${weekStart}`)
  } else {
    query = query.eq("is_recurring", true)
  }

  const { data, error } = await query.returns<BulletinItem[]>()

  if (error) {
    console.error("getBulletinItems error:", error.message)
    return []
  }
  return data ?? []
}

export interface CreateBulletinItemInput {
  title: string
  details?: string | null
  sort_order?: number
  is_recurring?: boolean
  week_start?: string | null
}

export async function createBulletinItem(input: CreateBulletinItemInput): Promise<BulletinItem | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("bulletin_items")
    .insert(input as never)
    .select()
    .single()
    .returns<BulletinItem>()

  if (error) {
    console.error("createBulletinItem error:", error.message)
    return null
  }
  return data
}

export async function updateBulletinItem(
  id: string,
  updates: Partial<Omit<BulletinItem, "id" | "created_at">>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("bulletin_items")
    .update(updates as never)
    .eq("id", id)

  if (error) {
    console.error("updateBulletinItem error:", error.message)
    return false
  }
  return true
}

export async function deleteBulletinItem(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("bulletin_items")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("deleteBulletinItem error:", error.message)
    return false
  }
  return true
}
