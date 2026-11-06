/**
 * Batch Host Family Query Utility
 *
 * Eliminates N+1 pattern when resolving host family details for multiple events.
 * Instead of querying families/addresses/members separately for each event,
 * collect all IDs upfront and batch-fetch in a single round-trip.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface HostFamilyInfo {
  hostName: string
  address: string
  city: string
  phone: string
}

interface FamilyRow {
  family_name: string
  home_phone: string | null
}

interface AddressRow {
  full_address: string
  city: string | null
  state: string | null
  zip: string | null
}

interface MemberRow {
  first_name: string
  role_in_family: string
  cell_phone: string | null
}

/**
 * Batch-resolve host family info for multiple family IDs
 * Returns a map: familyId → HostFamilyInfo
 */
export async function batchResolveHostFamilies(
  familyIds: string[],
  supabase: SupabaseClient
): Promise<Map<string, HostFamilyInfo>> {
  const result = new Map<string, HostFamilyInfo>()

  if (familyIds.length === 0) return result

  // Single round-trip: fetch all families, addresses, and members in parallel
  const [familiesRes, addressesRes, membersRes] = await Promise.all([
    supabase
      .from('families')
      .select('id, family_name, home_phone')
      .in('id', familyIds)
      .returns<Array<{ id: string } & FamilyRow>>(),

    supabase
      .from('addresses')
      .select('family_id, full_address, city, state, zip')
      .in('family_id', familyIds)
      .eq('is_current', true)
      .returns<Array<{ family_id: string } & AddressRow>>(),

    supabase
      .from('members')
      .select('family_id, first_name, role_in_family, cell_phone')
      .in('family_id', familyIds)
      .eq('is_active', true)
      .in('role_in_family', ['husband', 'wife'])
      .order('role_in_family')
      .returns<Array<{ family_id: string } & MemberRow>>(),
  ])

  // Build lookup maps
  const familiesMap = new Map<string, FamilyRow>()
  for (const f of familiesRes.data ?? []) {
    familiesMap.set(f.id, f)
  }

  const addressesMap = new Map<string, AddressRow>()
  for (const a of addressesRes.data ?? []) {
    addressesMap.set(a.family_id, a)
  }

  const membersByFamily = new Map<string, MemberRow[]>()
  for (const m of membersRes.data ?? []) {
    if (!membersByFamily.has(m.family_id)) {
      membersByFamily.set(m.family_id, [])
    }
    membersByFamily.get(m.family_id)!.push(m)
  }

  // Build result for each family
  for (const familyId of familyIds) {
    const family = familiesMap.get(familyId)
    const address = addressesMap.get(familyId)
    const members = membersByFamily.get(familyId) ?? []

    const husband = members.find(m => m.role_in_family === 'husband')
    const wife = members.find(m => m.role_in_family === 'wife')

    let hostName = family?.family_name ?? 'TBD'
    if (husband && wife) {
      hostName = `${husband.first_name} & ${wife.first_name}`
    } else if (husband) {
      hostName = husband.first_name
    } else if (wife) {
      hostName = wife.first_name
    }

    const phone = husband?.cell_phone ?? wife?.cell_phone ?? family?.home_phone ?? ''

    result.set(familyId, {
      hostName,
      address: address?.full_address ?? 'TBD',
      city: [address?.city, address?.state, address?.zip].filter(Boolean).join(', '),
      phone,
    })
  }

  return result
}
