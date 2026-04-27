/**
 * CCISR Contact Data Cleanup & Import Script
 *
 * Reads the original CCISR CONTACT.xlsx, normalizes all data, and generates
 * SQL to cleanly populate the database.
 *
 * Run: npx tsx supabase/scripts/import-clean-data.ts
 */

import * as XLSX from "xlsx"
import * as fs from "fs"
import * as path from "path"

// ── Config ──────────────────────────────────────────────────────────────────

const INPUT_FILE = path.resolve(__dirname, "../../../event_mgmt/CCISR CONTACT.xlsx")
const OUTPUT_SQL = path.resolve(__dirname, "clean_import.sql")
const OUTPUT_CSV = path.resolve(__dirname, "clean_data_review.csv")

// ── Types ───────────────────────────────────────────────────────────────────

interface ParsedFamily {
  familyName: string
  homePhone: string | null
  homeAddress: ParsedAddress | null
  weddingMonth: number | null
  weddingDay: number | null
  weddingYear: number | null
  husband: ParsedMember | null
  wife: ParsedMember | null
  children: ParsedMember[]
}

interface ParsedMember {
  firstName: string
  lastName: string
  fullName: string
  cellPhone: string | null
  email: string | null
  birthMonth: number | null
  birthDay: number | null
  birthYear: number | null
  role: "husband" | "wife" | "child"
}

interface ParsedAddress {
  street: string
  city: string
  state: string
  zip: string
  fullAddress: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function titleCase(str: string): string {
  if (!str) return ""
  return str
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (word.length === 0) return ""
      // Handle common abbreviations
      const upper = word.toUpperCase()
      if (["CA", "CT", "DR", "ST", "LN", "AVE", "BLVD", "PL", "RD", "WAY"].includes(upper)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

function formatPhone(input: string | number | null | undefined): string | null {
  if (input === null || input === undefined) return null
  let str = String(input).trim()
  if (str === "" || str === "-" || str === "?") return null

  // Remove non-digit chars
  let digits = str.replace(/[^0-9]/g, "")

  // Strip leading country code 1
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1)
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Return cleaned if not standard
  if (digits.length > 0) return str
  return null
}

function cleanEmail(input: string | null | undefined): string | null {
  if (!input) return null
  let str = String(input).trim().toLowerCase()
  if (str === "" || str === "-" || str === "?") return null

  // Remove parenthetical notes: "prisci.me1999@gmail.com (me.1999)"
  str = str.replace(/\s*\(.*\)\s*$/, "")

  // Fix common typos
  str = str.replace("@gamil.com", "@gmail.com")
  str = str.replace("@gnail.com", "@gmail.com")

  // Remove spaces
  str = str.replace(/\s+/g, "")

  // Remove "Hephzimelky@ gmail" → "hephzimelky@gmail.com"
  if (str.includes("@") && !str.includes(".")) {
    // Likely missing .com
    if (str.endsWith("gmail") || str.endsWith("yahoo") || str.endsWith("hotmail")) {
      str += ".com"
    }
  }

  if (!str.includes("@")) return null
  return str
}

// Excel serial number → { month, day } (year is unreliable — it's just the
// spreadsheet authoring date, not the actual birth/anniversary year)
function excelDateToComponents(
  value: number | string | null | undefined
): { month: number; day: number; year: number } | null {
  if (value === null || value === undefined) return null

  // Handle text dates like "Sept-26", "Jun-6th", "Apri-21", "March 3rd"
  if (typeof value === "string") {
    const str = value.trim()
    if (str === "" || str === "-" || str === "?") return null

    const monthMap: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, apri: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
      january: 1, february: 2, march: 3, april: 4, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    }

    const match = str.match(/^([a-z]+)[\s-]+(\d+)/i)
    if (match) {
      const monthStr = match[1].toLowerCase()
      const day = parseInt(match[2])
      const month = monthMap[monthStr]
      if (month && day >= 1 && day <= 31) {
        return { month, day, year: 0 }
      }
    }
    return null
  }

  if (typeof value !== "number" || value < 1000) return null

  // Excel date serial → JS date
  const excelEpoch = new Date(1899, 11, 30)
  const date = new Date(excelEpoch.getTime() + value * 86400000)

  if (isNaN(date.getTime())) return null

  // Only month + day are reliable. The year in the Excel serial is just when
  // the data was entered (2013 for original entries, 2022+ for newer ones),
  // NOT the person's actual birth year or wedding year.
  return {
    month: date.getMonth() + 1,
    day: date.getDate(),
    year: 0, // explicitly unknown
  }
}

// ── Address Parser ──────────────────────────────────────────────────────────

const KNOWN_CITIES: Record<string, string> = {
  "san ramon": "San Ramon",
  sanramon: "San Ramon",
  "san jose": "San Jose",
  sanjose: "San Jose",
  dublin: "Dublin",
  pleasanton: "Pleasanton",
  livermore: "Livermore",
  danville: "Danville",
  "mountain house": "Mountain House",
  mountainhouse: "Mountain House",
  "mount house": "Mountain House",
  tracy: "Tracy",
  brentwood: "Brentwood",
  oakland: "Oakland",
  hercules: "Hercules",
  clayton: "Clayton",
  "pleasant hill": "Pleasant Hill",
  emeryville: "Emeryville",
  manteca: "Manteca",
  milpitas: "Milpitas",
  california: "",
}

function parseAddress(raw: string | null | undefined): ParsedAddress | null {
  if (!raw) return null
  let str = String(raw).trim()
  if (str === "" || str === "?" || str === "-") return null

  // Remove gate codes, extra notes
  str = str.replace(/\s*gate:#?\d+/i, "")

  // Normalize dashes in zip context: "CA - 94582" → "CA 94582"
  str = str.replace(/\s*-\s*(\d{5})/g, " $1")

  // Handle "CA94582" or "CA-94582" (no space between state and zip)
  str = str.replace(/\bCA[-\s]?(\d{5})\b/gi, "CA $1")

  // Try to extract zip code
  let zip = ""
  const zipMatch = str.match(/\b(\d{5})(?:-\d{4})?\b/)
  if (zipMatch) {
    zip = zipMatch[1]
    str = str.replace(zipMatch[0], "").trim()
  }

  // Try to extract state
  let state = ""
  const stateMatch = str.match(/\b(CA|California)\b/i)
  if (stateMatch) {
    state = "CA"
    str = str.replace(stateMatch[0], "").trim()
  }

  // Clean up trailing/leading commas and spaces
  str = str.replace(/,\s*,/g, ",").replace(/,\s*$/, "").replace(/^\s*,/, "").trim()

  // Split remaining by comma - last part is likely city
  const parts = str.split(",").map((p) => p.trim()).filter(Boolean)

  let street = ""
  let city = ""

  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1]

    // Check if the last part contains a known city embedded with other text
    // e.g., "Apt 17 Sanramon" → city=San Ramon, remainder="Apt 17"
    let cityFoundInLast = false
    for (const [key, canonical] of Object.entries(KNOWN_CITIES)) {
      if (!canonical) continue
      // Match city name with optional space variations in the last part
      const pattern = new RegExp(key.replace(/\s+/g, "\\s*"), "i")
      const match = lastPart.match(pattern)
      if (match) {
        city = canonical
        const prefix = lastPart.substring(0, match.index!).replace(/,?\s*$/, "").trim()
        if (prefix) {
          parts[parts.length - 1] = prefix
        } else {
          parts.pop()
        }
        cityFoundInLast = true
        break
      }
    }

    if (!cityFoundInLast) {
      city = parts.pop()!
    }

    street = parts.join(", ")
  } else if (parts.length === 1) {
    // Try to detect city in the single string
    const singleStr = parts[0].toLowerCase()
    let foundCity = ""
    for (const [key, canonical] of Object.entries(KNOWN_CITIES)) {
      if (singleStr.includes(key) && canonical) {
        foundCity = canonical
        // Extract street as everything before the city name
        const idx = singleStr.indexOf(key)
        street = parts[0].substring(0, idx).replace(/,?\s*$/, "").trim()
        break
      }
    }
    if (foundCity) {
      city = foundCity
    } else {
      street = parts[0]
    }
  }

  // Normalize city name
  const cityLower = city.toLowerCase().trim()
  if (KNOWN_CITIES[cityLower]) {
    city = KNOWN_CITIES[cityLower]
  } else if (city) {
    city = titleCase(city)
  }

  // Handle "Tracy" appearing after Mountain House
  if (city === "Tracy" && street.toLowerCase().includes("mountain house")) {
    city = "Mountain House"
    street = street.replace(/,?\s*mountain house/i, "").trim()
  }

  // Default state to CA — this is a Bay Area church, all members are in California
  if (!state) {
    state = "CA"
  }

  // Fill in missing zip codes from known city defaults
  if (!zip && city) {
    const defaultZips: Record<string, string> = {
      "San Ramon": "94582",
      "Dublin": "94568",
      "Pleasanton": "94566",
      "Livermore": "94551",
      "Danville": "94526",
      "Mountain House": "95391",
      "Tracy": "95376",
      "Brentwood": "94513",
      "Oakland": "94601",
      "Hercules": "94547",
      "Clayton": "94517",
      "San Jose": "95120",
      "Pleasant Hill": "94523",
      "Emeryville": "94608",
      "Manteca": "95337",
      "Milpitas": "95035",
    }
    zip = defaultZips[city] ?? ""
  }

  // Title case street
  street = titleCase(street)

  if (!street && !city) return null

  const fullAddress = [street, city, state ? `${state} ${zip}` : zip]
    .filter(Boolean)
    .join(", ")

  return { street, city, state, zip, fullAddress }
}

// ── Name Parser ─────────────────────────────────────────────────────────────

function parseName(raw: string | null | undefined): { first: string; last: string; full: string } | null {
  if (!raw) return null
  let str = String(raw).trim()
  if (str === "" || str === "-" || str === "?") return null

  // Skip entries that are just dashes or placeholders
  if (/^[-?.\s]+$/.test(str)) return null

  // Remove parenthetical nicknames: "Balaji Sudarsan ( Alex)" → "Balaji Sudarsan"
  str = str.replace(/\s*\(.*\)\s*/, " ").trim()

  // Remove trailing special chars
  str = str.replace(/[)]+$/, "").trim()

  // Remove trailing " -" or " -" patterns (e.g. "Sigamala -")
  str = str.replace(/\s*-\s*$/, "").trim()

  // Remove "Pastor " prefix for name normalization
  str = str.replace(/^Pastor\s+/i, "")

  // Title case
  str = titleCase(str)

  const parts = str.split(/\s+/)
  if (parts.length === 0) return null

  if (parts.length === 1) {
    return { first: parts[0], last: "", full: parts[0] }
  }

  const first = parts[0]
  const last = parts.slice(1).join(" ")
  return { first, last, full: `${first} ${last}` }
}

function inferFamilyName(husband: ParsedMember | null, wife: ParsedMember | null): string {
  // Use husband's last name if available
  if (husband && husband.lastName) return husband.lastName
  if (wife && wife.lastName) return wife.lastName
  // Fallback to first name
  if (husband) return husband.firstName
  if (wife) return wife.firstName
  return "Unknown"
}

function deduplicateFamilyNames(families: ParsedFamily[]) {
  const nameCount = new Map<string, number>()
  for (const f of families) {
    const key = f.familyName.toLowerCase()
    nameCount.set(key, (nameCount.get(key) ?? 0) + 1)
  }

  for (const f of families) {
    const key = f.familyName.toLowerCase()
    if ((nameCount.get(key) ?? 0) > 1) {
      // Different households with same last name — prefix with husband's first name
      const prefix = f.husband?.firstName ?? f.wife?.firstName ?? ""
      if (prefix) {
        f.familyName = `${prefix} ${f.familyName}`
      }
    }
  }
}

// ── Main Parser ─────────────────────────────────────────────────────────────

function parseRow(row: (string | number | null | undefined)[]): ParsedFamily | null {
  // Columns from "Member details":
  // [0] index, [1] him_name, [2] him_phone, [3] him_email, [4] him_bday,
  // [5] null, [6] her_name, [7] her_phone, [8] her_email, [9] her_bday,
  // [10] null, [11] address, [12] home_phone, [13] wedding_date,
  // [14] null, [15] child1_name, [16] child1_bday, [17] child2_name, [18] child2_bday,
  // [19] child3_name, [20] child3_bday, [21] child4_name, [22] child4_bday

  const himName = parseName(row[1] as string)
  const herName = parseName(row[6] as string)

  if (!himName && !herName) return null

  let husband: ParsedMember | null = null
  if (himName) {
    husband = {
      firstName: himName.first,
      lastName: himName.last,
      fullName: himName.full,
      cellPhone: formatPhone(row[2] as string | number),
      email: cleanEmail(row[3] as string),
      ...(() => {
        const d = excelDateToComponents(row[4] as number | string)
        return { birthMonth: d?.month ?? null, birthDay: d?.day ?? null, birthYear: d && d.year > 0 ? d.year : null }
      })(),
      role: "husband" as const,
    }
  }

  let wife: ParsedMember | null = null
  if (herName) {
    wife = {
      firstName: herName.first,
      lastName: herName.last,
      fullName: herName.full,
      cellPhone: formatPhone(row[7] as string | number),
      email: cleanEmail(row[8] as string),
      ...(() => {
        const d = excelDateToComponents(row[9] as number | string)
        return { birthMonth: d?.month ?? null, birthDay: d?.day ?? null, birthYear: d && d.year > 0 ? d.year : null }
      })(),
      role: "wife" as const,
    }
  }

  // Handle special cases in name fields
  // "Lydia wilson (tk12run@gmail.com)" — email embedded in name
  if (husband && husband.fullName.includes("@")) {
    const emailMatch = husband.fullName.match(/[\w.-]+@[\w.-]+/)
    if (emailMatch && !husband.email) husband.email = cleanEmail(emailMatch[0])
  }
  if (wife && wife.fullName.includes("@")) {
    const emailMatch = wife.fullName.match(/[\w.-]+@[\w.-]+/)
    if (emailMatch && !wife.email) wife.email = cleanEmail(emailMatch[0])
  }

  // "Shilpa" / "Shilpa Jothi" or "Bharathi" / "Bharathi Chandrashaker"
  // Husband column is single first name matching wife's first name — drop the husband placeholder
  if (husband && wife && !husband.lastName && husband.firstName.toLowerCase() === wife.firstName.toLowerCase()) {
    husband = null
  }

  // Children
  const children: ParsedMember[] = []
  const childSlots = [
    [15, 16], [17, 18], [19, 20], [21, 22],
  ]
  const parentLastName = husband?.lastName || wife?.lastName || ""

  for (const [nameIdx, bdayIdx] of childSlots) {
    const childNameRaw = row[nameIdx] as string
    if (!childNameRaw) continue
    const childName = parseName(childNameRaw)
    if (!childName) continue

    // If child has no last name, use parent's
    if (!childName.last && parentLastName) {
      childName.last = parentLastName
      childName.full = `${childName.first} ${parentLastName}`
    }

    const d = excelDateToComponents(row[bdayIdx] as number | string)
    children.push({
      firstName: childName.first,
      lastName: childName.last,
      fullName: childName.full,
      cellPhone: null,
      email: null,
      birthMonth: d?.month ?? null,
      birthDay: d?.day ?? null,
      birthYear: d && d.year > 0 ? d.year : null,
      role: "child",
    })
  }

  const address = parseAddress(row[11] as string)
  const homePhone = formatPhone(row[12] as string | number)

  const weddingDate = excelDateToComponents(row[13] as number | string)

  const familyName = inferFamilyName(husband, wife)

  return {
    familyName,
    homePhone,
    homeAddress: address,
    weddingMonth: weddingDate?.month ?? null,
    weddingDay: weddingDate?.day ?? null,
    weddingYear: weddingDate && weddingDate.year > 0 ? weddingDate.year : null,
    husband,
    wife,
    children,
  }
}

// ── SQL Generation ──────────────────────────────────────────────────────────

function escSql(val: string | null): string {
  if (val === null) return "NULL"
  return `'${val.replace(/'/g, "''")}'`
}

function generateSQL(families: ParsedFamily[]): string {
  const lines: string[] = []

  lines.push("-- =============================================================================")
  lines.push("-- CCISR Connect — Clean Data Import")
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push(`-- Families: ${families.length}`)
  lines.push("-- =============================================================================")
  lines.push("-- WARNING: This script DELETES existing data and re-imports from clean source.")
  lines.push("-- Back up your database before running!")
  lines.push("-- =============================================================================")
  lines.push("")
  lines.push("BEGIN;")
  lines.push("")

  // Clear existing data in dependency order
  lines.push("-- ── Clear existing data ──────────────────────────────────────────────────")
  lines.push("DELETE FROM member_tags;")
  lines.push("DELETE FROM mailing_list_members WHERE member_id IS NOT NULL;")
  lines.push("DELETE FROM wedding_anniversaries;")
  lines.push("DELETE FROM addresses;")
  lines.push("DELETE FROM members;")
  lines.push("DELETE FROM families;")
  lines.push("")

  for (let i = 0; i < families.length; i++) {
    const fam = families[i]
    const famVar = `fam_${i}`

    lines.push(`-- ── Family ${i + 1}: ${fam.familyName} ──`)
    lines.push(`DO $${famVar}$`)
    lines.push("DECLARE")
    lines.push("  v_family_id uuid;")
    if (fam.husband) lines.push("  v_husband_id uuid;")
    if (fam.wife) lines.push("  v_wife_id uuid;")
    lines.push("BEGIN")

    // Insert family
    lines.push(`  INSERT INTO families (id, family_name, home_phone, is_active, notes)`)
    lines.push(`  VALUES (gen_random_uuid(), ${escSql(fam.familyName)}, ${escSql(fam.homePhone)}, true, NULL)`)
    lines.push(`  RETURNING id INTO v_family_id;`)
    lines.push("")

    // Insert address
    if (fam.homeAddress) {
      const a = fam.homeAddress
      lines.push(`  INSERT INTO addresses (id, family_id, street, city, state, zip, full_address, is_current)`)
      lines.push(`  VALUES (gen_random_uuid(), v_family_id, ${escSql(a.street)}, ${escSql(a.city)}, ${escSql(a.state)}, ${escSql(a.zip)}, ${escSql(a.fullAddress)}, true);`)
      lines.push("")
    }

    // Insert husband
    if (fam.husband) {
      const m = fam.husband
      lines.push(`  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)`)
      lines.push(`  VALUES (gen_random_uuid(), v_family_id, ${escSql(m.firstName)}, ${escSql(m.lastName)}, ${escSql(m.fullName)}, 'husband', ${escSql(m.cellPhone)}, ${escSql(m.email)}, ${m.birthMonth ?? "NULL"}, ${m.birthDay ?? "NULL"}, ${m.birthYear ?? "NULL"}, true, false, false)`)
      lines.push(`  RETURNING id INTO v_husband_id;`)
      lines.push("")
    }

    // Insert wife
    if (fam.wife) {
      const m = fam.wife
      lines.push(`  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)`)
      lines.push(`  VALUES (gen_random_uuid(), v_family_id, ${escSql(m.firstName)}, ${escSql(m.lastName)}, ${escSql(m.fullName)}, 'wife', ${escSql(m.cellPhone)}, ${escSql(m.email)}, ${m.birthMonth ?? "NULL"}, ${m.birthDay ?? "NULL"}, ${m.birthYear ?? "NULL"}, true, false, false)`)
      lines.push(`  RETURNING id INTO v_wife_id;`)
      lines.push("")
    }

    // Insert children
    for (const child of fam.children) {
      lines.push(`  INSERT INTO members (id, family_id, first_name, last_name, full_name, role_in_family, cell_phone, email, birth_month, birth_day, birth_year, is_active, is_newcomer, newcomer_acknowledged)`)
      lines.push(`  VALUES (gen_random_uuid(), v_family_id, ${escSql(child.firstName)}, ${escSql(child.lastName)}, ${escSql(child.fullName)}, 'child', NULL, NULL, ${child.birthMonth ?? "NULL"}, ${child.birthDay ?? "NULL"}, ${child.birthYear ?? "NULL"}, true, false, false);`)
    }

    // Insert wedding anniversary
    if (fam.weddingMonth && fam.weddingDay && fam.husband && fam.wife) {
      lines.push("")
      lines.push(`  INSERT INTO wedding_anniversaries (id, family_id, husband_member_id, wife_member_id, anniversary_month, anniversary_day, anniversary_year)`)
      lines.push(`  VALUES (gen_random_uuid(), v_family_id, v_husband_id, v_wife_id, ${fam.weddingMonth}, ${fam.weddingDay}, ${fam.weddingYear ?? "NULL"});`)
    }

    lines.push("END;")
    lines.push(`$${famVar}$;`)
    lines.push("")
  }

  lines.push("COMMIT;")
  lines.push("")
  lines.push("-- Verify counts:")
  lines.push("SELECT 'families' AS entity, count(*) FROM families")
  lines.push("UNION ALL SELECT 'members', count(*) FROM members")
  lines.push("UNION ALL SELECT 'addresses', count(*) FROM addresses")
  lines.push("UNION ALL SELECT 'anniversaries', count(*) FROM wedding_anniversaries;")

  return lines.join("\n")
}

// ── CSV Review ──────────────────────────────────────────────────────────────

function generateCSV(families: ParsedFamily[]): string {
  const rows: string[][] = []
  rows.push([
    "Family", "Role", "First Name", "Last Name", "Full Name",
    "Cell Phone", "Email", "Birth Month", "Birth Day", "Birth Year",
    "Street", "City", "State", "Zip", "Home Phone",
    "Wedding Month", "Wedding Day", "Wedding Year",
  ])

  for (const fam of families) {
    const addr = fam.homeAddress
    const base = [
      addr?.street ?? "", addr?.city ?? "", addr?.state ?? "", addr?.zip ?? "",
      fam.homePhone ?? "",
      fam.weddingMonth?.toString() ?? "", fam.weddingDay?.toString() ?? "", fam.weddingYear?.toString() ?? "",
    ]

    const members = [fam.husband, fam.wife, ...fam.children].filter(Boolean) as ParsedMember[]
    for (const m of members) {
      rows.push([
        fam.familyName, m.role, m.firstName, m.lastName, m.fullName,
        m.cellPhone ?? "", m.email ?? "",
        m.birthMonth?.toString() ?? "", m.birthDay?.toString() ?? "", m.birthYear?.toString() ?? "",
        ...base,
      ])
    }
  }

  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("Reading:", INPUT_FILE)
  const wb = XLSX.readFile(INPUT_FILE)
  const ws = wb.Sheets["Member details"]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number | null)[][]

  const families: ParsedFamily[] = []
  let skipped = 0

  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue

    const parsed = parseRow(row)
    if (parsed) {
      families.push(parsed)
    } else {
      skipped++
      console.warn(`  Skipped row ${i}: could not parse`)
    }
  }

  console.log(`\nParsed ${families.length} families (${skipped} skipped)`)

  // Disambiguate families with the same last name (Victor, Samuel, Jebaraj, etc.)
  deduplicateFamilyNames(families)

  // Stats
  let totalMembers = 0
  let totalAddresses = 0
  let totalAnniversaries = 0
  let issues: string[] = []

  for (const fam of families) {
    const memberCount = (fam.husband ? 1 : 0) + (fam.wife ? 1 : 0) + fam.children.length
    totalMembers += memberCount
    if (fam.homeAddress) totalAddresses++
    if (fam.weddingMonth && fam.weddingDay) totalAnniversaries++

    // Flag issues
    if (!fam.homeAddress) issues.push(`${fam.familyName}: no address`)
    if (fam.husband && !fam.husband.email && !fam.husband.cellPhone) {
      issues.push(`${fam.familyName} (husband ${fam.husband.fullName}): no contact info`)
    }
    if (fam.wife && !fam.wife.email && !fam.wife.cellPhone) {
      issues.push(`${fam.familyName} (wife ${fam.wife.fullName}): no contact info`)
    }
  }

  console.log(`  Members: ${totalMembers}`)
  console.log(`  Addresses: ${totalAddresses}`)
  console.log(`  Anniversaries: ${totalAnniversaries}`)

  if (issues.length > 0) {
    console.log(`\nData quality notes (${issues.length}):`)
    for (const issue of issues) {
      console.log(`  - ${issue}`)
    }
  }

  // Check for duplicate family names
  const nameCounts = new Map<string, number>()
  for (const fam of families) {
    const key = fam.familyName.toLowerCase()
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1)
  }
  const dupes = [...nameCounts.entries()].filter(([, count]) => count > 1)
  if (dupes.length > 0) {
    console.log("\nDuplicate family names detected:")
    for (const [name, count] of dupes) {
      console.log(`  - "${name}" appears ${count} times`)
      const matching = families.filter((f) => f.familyName.toLowerCase() === name)
      for (const m of matching) {
        const h = m.husband?.fullName ?? "(no husband)"
        const w = m.wife?.fullName ?? "(no wife)"
        console.log(`    → ${h} + ${w} | ${m.homeAddress?.city ?? "no city"}`)
      }
    }
  }

  // Generate outputs
  const sql = generateSQL(families)
  fs.writeFileSync(OUTPUT_SQL, sql)
  console.log(`\nSQL written to: ${OUTPUT_SQL}`)

  const csv = generateCSV(families)
  fs.writeFileSync(OUTPUT_CSV, csv)
  console.log(`CSV written to: ${OUTPUT_CSV} (review before running SQL)`)

  // Print sample families for verification
  console.log("\n── Sample cleaned data ──")
  for (const fam of families.slice(0, 5)) {
    console.log(`\n${fam.familyName} family:`)
    if (fam.husband) console.log(`  Husband: ${fam.husband.fullName} | ${fam.husband.cellPhone ?? "no phone"} | ${fam.husband.email ?? "no email"}`)
    if (fam.wife) console.log(`  Wife: ${fam.wife.fullName} | ${fam.wife.cellPhone ?? "no phone"} | ${fam.wife.email ?? "no email"}`)
    for (const c of fam.children) console.log(`  Child: ${c.fullName}`)
    if (fam.homeAddress) console.log(`  Address: ${fam.homeAddress.fullAddress}`)
    if (fam.homePhone) console.log(`  Home: ${fam.homePhone}`)
    if (fam.weddingMonth) console.log(`  Anniversary: ${fam.weddingMonth}/${fam.weddingDay}${fam.weddingYear ? `/${fam.weddingYear}` : ""}`)
  }
}

main()
