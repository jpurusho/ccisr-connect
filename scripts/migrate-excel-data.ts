/**
 * Data Migration Script: Excel -> Supabase
 *
 * Reads CCISR CONTACT.xlsx and Family Bible Study Hosting for 2026.xlsx,
 * normalizes data, deduplicates, and inserts into Supabase.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-excel-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_DIR = path.resolve(__dirname, "../../event_mgmt");
const CONTACT_FILE = path.join(DATA_DIR, "CCISR CONTACT.xlsx");
const HOSTING_FILE = path.join(DATA_DIR, "Family Bible Study Hosting for 2026.xlsx");

// Column indices (0-based) from the "Member details" sheet row 2 headers
const COL = {
  HIM_NAME: 1,
  HIM_PHONE: 2,
  HIM_EMAIL: 3,
  HIM_BIRTH: 4,
  HER_NAME: 6,
  HER_PHONE: 7,
  HER_EMAIL: 8,
  HER_BIRTH: 9,
  HOME_ADDR: 11,
  HOME_PHONE: 12,
  WEDDING: 13,
  CHILD1_NAME: 15,
  CHILD1_BIRTH: 16,
  CHILD2_NAME: 17,
  CHILD2_BIRTH: 18,
  CHILD3_NAME: 19,
  CHILD3_BIRTH: 20,
  CHILD4_NAME: 21,
  CHILD4_BIRTH: 22,
};

const log = {
  families_created: 0,
  members_created: 0,
  addresses_created: 0,
  anniversaries_created: 0,
  newcomers_created: 0,
  events_created: 0,
  event_instances_created: 0,
  warnings: [] as string[],
  errors: [] as string[],
};

function normalizePhone(phone: unknown): string | null {
  if (!phone) return null;
  const str = String(phone).replace(/\.0$/, "").trim();
  if (!str || str === "-") return null;
  const digits = str.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return str;
}

function parseDate(val: unknown): { month: number; day: number; year: number | null } | null {
  if (!val) return null;
  if (typeof val === "number") {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) return { month: parsed.m, day: parsed.d, year: parsed.y === 2013 ? null : parsed.y };
    return null;
  }
  if (val instanceof Date) {
    const m = val.getMonth() + 1;
    const d = val.getDate();
    const y = val.getFullYear();
    return { month: m, day: d, year: y === 2013 ? null : y };
  }
  const str = String(val).trim();
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) return { month: parseInt(slashMatch[1]), day: parseInt(slashMatch[2]), year: slashMatch[3] ? parseInt(slashMatch[3]) : null };
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return { month: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear() === 2013 ? null : d.getFullYear() };
}

function parseName(fullName: unknown): { first: string; last: string; full: string } {
  if (!fullName) return { first: "", last: "", full: "" };
  const name = String(fullName).trim().replace(/^\)|\)$/g, "").trim();
  if (!name) return { first: "", last: "", full: "" };
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "", full: name };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1], full: name };
}

function parseAddress(addr: unknown): { street: string; city: string; state: string; zip: string; full: string } | null {
  if (!addr) return null;
  const full = String(addr).trim();
  if (!full) return null;
  const match = full.match(/^(.+?),\s*([A-Za-z\s]+?)(?:,\s*|\s+)(CA|California)\s*(\d{5}(?:-\d{4})?)$/i);
  if (match) return { street: match[1].trim(), city: match[2].trim().replace(/,\s*$/, ""), state: "CA", zip: match[4], full };
  const parts = full.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const stateZip = lastPart.match(/([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/);
    if (stateZip) return { street: parts.slice(0, -2).join(", ") || parts[0], city: parts.length >= 3 ? parts[parts.length - 2] : "", state: stateZip[1], zip: stateZip[2], full };
  }
  return { street: full, city: "", state: "", zip: "", full };
}

function cell(row: unknown[], idx: number): unknown {
  return row[idx] ?? null;
}

function cellStr(row: unknown[], idx: number): string | null {
  const v = row[idx];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "-" ? null : s;
}

async function migrateMemberDetails() {
  console.log("--- Migrating Member Details ---");
  if (!fs.existsSync(CONTACT_FILE)) { log.errors.push("Contact file not found"); return; }

  const wb = XLSX.readFile(CONTACT_FILE);
  const ws = wb.Sheets["Member details"];
  if (!ws) { log.errors.push("Sheet 'Member details' not found"); return; }

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  // Data starts at row 3 (index 2), rows 0-1 are title and headers
  const dataRows = rawRows.slice(2);
  console.log(`  Found ${dataRows.length} data rows`);

  const seenKeys = new Set<string>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const himName = cellStr(row, COL.HIM_NAME);
    const herName = cellStr(row, COL.HER_NAME);
    if (!himName && !herName) continue;

    const himParsed = parseName(himName);
    const herParsed = parseName(herName);
    const familyName = himParsed.last || herParsed.last || himParsed.first || herParsed.first;
    if (!familyName) { log.warnings.push(`Row ${i + 3}: No family name`); continue; }

    const dedupKey = `${familyName.toLowerCase()}-${normalizePhone(cell(row, COL.HIM_PHONE))}-${normalizePhone(cell(row, COL.HER_PHONE))}`;
    if (seenKeys.has(dedupKey)) { log.warnings.push(`Row ${i + 3}: Duplicate skipped: ${familyName}`); continue; }
    seenKeys.add(dedupKey);

    const { data: family, error: famErr } = await supabase
      .from("families")
      .insert({ family_name: familyName, home_phone: normalizePhone(cell(row, COL.HOME_PHONE)), is_active: true })
      .select("id")
      .single();

    if (famErr || !family) { log.errors.push(`Row ${i + 3}: Family create failed: ${famErr?.message}`); continue; }
    log.families_created++;
    const familyId = family.id;

    // Address
    const addr = parseAddress(cell(row, COL.HOME_ADDR));
    if (addr) {
      const { error: addrErr } = await supabase.from("addresses").insert({
        family_id: familyId, street: addr.street, city: addr.city, state: addr.state, zip: addr.zip, full_address: addr.full, is_current: true,
      });
      if (!addrErr) log.addresses_created++;
      else log.warnings.push(`Row ${i + 3}: Address failed: ${addrErr.message}`);
    }

    // Husband
    let husbandId: string | null = null;
    if (himName) {
      const birth = parseDate(cell(row, COL.HIM_BIRTH));
      const { data: m, error } = await supabase.from("members").insert({
        family_id: familyId, first_name: himParsed.first, last_name: himParsed.last || familyName,
        full_name: himParsed.full, role_in_family: "husband",
        cell_phone: normalizePhone(cell(row, COL.HIM_PHONE)), email: cellStr(row, COL.HIM_EMAIL),
        birth_month: birth?.month ?? null, birth_day: birth?.day ?? null, birth_year: birth?.year ?? null,
        is_active: true,
      }).select("id").single();
      if (!error && m) { husbandId = m.id; log.members_created++; }
      else log.errors.push(`Row ${i + 3}: Husband failed: ${error?.message}`);
    }

    // Wife
    let wifeId: string | null = null;
    if (herName) {
      const birth = parseDate(cell(row, COL.HER_BIRTH));
      const { data: m, error } = await supabase.from("members").insert({
        family_id: familyId, first_name: herParsed.first, last_name: herParsed.last || familyName,
        full_name: herParsed.full, role_in_family: "wife",
        cell_phone: normalizePhone(cell(row, COL.HER_PHONE)), email: cellStr(row, COL.HER_EMAIL),
        birth_month: birth?.month ?? null, birth_day: birth?.day ?? null, birth_year: birth?.year ?? null,
        is_active: true,
      }).select("id").single();
      if (!error && m) { wifeId = m.id; log.members_created++; }
      else log.errors.push(`Row ${i + 3}: Wife failed: ${error?.message}`);
    }

    // Children
    const childCols = [
      [COL.CHILD1_NAME, COL.CHILD1_BIRTH],
      [COL.CHILD2_NAME, COL.CHILD2_BIRTH],
      [COL.CHILD3_NAME, COL.CHILD3_BIRTH],
      [COL.CHILD4_NAME, COL.CHILD4_BIRTH],
    ];
    for (const [nameCol, birthCol] of childCols) {
      const childName = cellStr(row, nameCol);
      if (!childName) continue;
      const childParsed = parseName(childName);
      const birth = parseDate(cell(row, birthCol));
      const { error } = await supabase.from("members").insert({
        family_id: familyId, first_name: childParsed.first, last_name: childParsed.last || familyName,
        full_name: childParsed.full, role_in_family: "child",
        birth_month: birth?.month ?? null, birth_day: birth?.day ?? null, birth_year: birth?.year ?? null,
        is_active: true,
      });
      if (!error) log.members_created++;
      else log.warnings.push(`Row ${i + 3}: Child ${childName} failed: ${error.message}`);
    }

    // Wedding anniversary
    const wedding = parseDate(cell(row, COL.WEDDING));
    if (wedding && husbandId && wifeId) {
      const { error } = await supabase.from("wedding_anniversaries").insert({
        family_id: familyId, husband_member_id: husbandId, wife_member_id: wifeId,
        anniversary_month: wedding.month, anniversary_day: wedding.day, anniversary_year: wedding.year,
      });
      if (!error) log.anniversaries_created++;
      else log.warnings.push(`Row ${i + 3}: Anniversary failed: ${error.message}`);
    }
  }
}

async function migrateNewcomers() {
  console.log("--- Migrating Newcomers (2026) ---");
  if (!fs.existsSync(CONTACT_FILE)) return;
  const wb = XLSX.readFile(CONTACT_FILE);
  const ws = wb.Sheets["New comer 2026"];
  if (!ws) { log.warnings.push("Sheet 'New comer 2026' not found"); return; }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  for (const row of rows) {
    const himName = row["Name (Him)"] as string | null;
    const herName = row["Name(her)"] as string | null;
    if (!himName && !herName) continue;

    const himParsed = parseName(himName);
    const herParsed = parseName(herName);
    const familyName = himParsed.last || herParsed.last || himParsed.first || herParsed.first;
    if (!familyName) continue;

    const { data: family, error: famErr } = await supabase
      .from("families").insert({ family_name: familyName, is_active: true }).select("id").single();
    if (famErr || !family) { log.warnings.push(`Newcomer: Family ${familyName} failed: ${famErr?.message}`); continue; }
    log.families_created++;
    log.newcomers_created++;

    const insertMember = async (name: string, parsed: ReturnType<typeof parseName>, role: string, phone: unknown, email: unknown) => {
      await supabase.from("members").insert({
        family_id: family.id, first_name: parsed.first, last_name: parsed.last || familyName,
        full_name: parsed.full, role_in_family: role,
        cell_phone: normalizePhone(phone), email: email ? String(email).trim() : null,
        is_active: true, is_newcomer: true, newcomer_acknowledged: false, newcomer_date: "2026-01-01",
      });
      log.members_created++;
    };

    if (himName) await insertMember(himName, himParsed, "husband", row["Cell phone"], row["Email"]);
    if (herName) await insertMember(herName, herParsed, "wife", row["Cell Phone"], row["Email_1"] ?? row["Email__1"]);

    for (let c = 1; c <= 4; c++) {
      const childName = row[`Child ${c} Name`] as string | null;
      if (!childName) continue;
      const cp = parseName(childName);
      await supabase.from("members").insert({
        family_id: family.id, first_name: cp.first, last_name: cp.last || familyName,
        full_name: cp.full, role_in_family: "child", is_active: true, is_newcomer: true,
        newcomer_acknowledged: false, newcomer_date: "2026-01-01",
      });
      log.members_created++;
    }
  }
}

async function migrateHostingSchedule() {
  console.log("--- Migrating Hosting Schedule ---");
  if (!fs.existsSync(HOSTING_FILE)) return;

  const { data: eventType } = await supabase.from("event_types").select("id").eq("name", "friday_bible_study").single();
  if (!eventType) { log.warnings.push("Event type friday_bible_study not found"); return; }

  const { data: event } = await supabase.from("events").insert({
    event_type_id: eventType.id, title: "San Ramon Friday Bible Study",
    description: "Weekly Bible Study - Studying the Book of Acts",
    recurrence_rule: "FREQ=WEEKLY;BYDAY=FR", default_time: "19:30", is_active: true,
  }).select("id").single();

  if (!event) { log.errors.push("Failed to create Bible Study event"); return; }
  log.events_created++;

  const wb = XLSX.readFile(HOSTING_FILE);
  const ws = wb.Sheets["Bible Study 2026"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  const monthMap: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };

  for (const row of rows) {
    const monthStr = row["Preferred Month"] as string | null;
    if (!monthStr) continue;
    const monthNum = monthMap[monthStr.toLowerCase().trim()];
    if (!monthNum) continue;
    const hostName = row["Name"] as string | null;
    if (!hostName || hostName.toLowerCase().includes("break")) continue;

    const address = row["Address"] as string | null;
    const contact = row["Contact Number "] as string | null;

    const firstDay = new Date(2026, monthNum - 1, 1);
    const dayOfWeek = firstDay.getDay();
    const firstFriday = new Date(2026, monthNum - 1, ((5 - dayOfWeek + 7) % 7) + 1);
    const fridays: Date[] = [];
    const d = new Date(firstFriday);
    while (d.getMonth() === monthNum - 1) { fridays.push(new Date(d)); d.setDate(d.getDate() + 7); }

    for (const fri of fridays) {
      const { error } = await supabase.from("event_instances").insert({
        event_id: event.id, instance_date: fri.toISOString().split("T")[0],
        instance_time: "19:30", location_override: address,
        notes: contact ? `Host: ${hostName} | Contact: ${contact}` : `Host: ${hostName}`,
        status: "confirmed",
      });
      if (!error) log.event_instances_created++;
    }
  }
}

async function createDefaultMailingLists() {
  console.log("--- Creating Default Mailing Lists ---");
  const lists = [
    { name: "All Active Members", description: "All active church members with email addresses" },
    { name: "Women's Bible Study", description: "Women's Wednesday Bible study group" },
    { name: "Bulletin Recipients", description: "Weekly bulletin email recipients" },
    { name: "Prayer Meeting", description: "Monthly prayer meeting notifications" },
  ];
  for (const list of lists) {
    await supabase.from("mailing_lists").insert(list);
  }
}

async function main() {
  console.log("=== CCISR Connect Data Migration ===\n");

  // Clear existing data for re-run safety
  console.log("Clearing existing data...");
  await supabase.from("event_instances").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("wedding_anniversaries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("mailing_list_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("mailing_lists").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("addresses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("families").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("Done clearing.\n");

  await migrateMemberDetails();
  await migrateNewcomers();
  await migrateHostingSchedule();
  await createDefaultMailingLists();

  console.log("\n=== Migration Summary ===");
  console.log(`Families created:        ${log.families_created}`);
  console.log(`Members created:         ${log.members_created}`);
  console.log(`Addresses created:       ${log.addresses_created}`);
  console.log(`Anniversaries created:   ${log.anniversaries_created}`);
  console.log(`Newcomers flagged:       ${log.newcomers_created}`);
  console.log(`Events created:          ${log.events_created}`);
  console.log(`Event instances created: ${log.event_instances_created}`);
  console.log(`Warnings:                ${log.warnings.length}`);
  console.log(`Errors:                  ${log.errors.length}`);

  if (log.errors.length > 0) {
    console.log("\n--- Errors ---");
    log.errors.forEach((e) => console.log(`  ${e}`));
  }
  if (log.warnings.length > 0) {
    console.log("\n--- Warnings ---");
    log.warnings.slice(0, 20).forEach((w) => console.log(`  ${w}`));
    if (log.warnings.length > 20) console.log(`  ... and ${log.warnings.length - 20} more`);
  }

  fs.writeFileSync(path.join(__dirname, "migration-log.json"), JSON.stringify(log, null, 2));
}

main().catch(console.error);
