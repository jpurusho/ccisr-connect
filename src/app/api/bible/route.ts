import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { ApiError } from "@/lib/api-response"
import { bibleVerseSchema, validateRequest } from "@/lib/validation-schemas"
import type { BibleVerseResponse } from "@/types/api"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface VerseResult {
  text: string
  reference: string
  version: string
}

async function getEsvApiKey(): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "esv_api_key")
      .single()
    return (data?.value as string) || process.env.ESV_API_KEY || ""
  } catch {
    return process.env.ESV_API_KEY || ""
  }
}

async function fetchESV(reference: string): Promise<VerseResult | null> {
  const apiKey = await getEsvApiKey()
  if (!apiKey) return null
  try {
    const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(reference)}&include-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false&include-passage-references=false&indent-paragraphs=0`
    const res = await fetch(url, {
      headers: { Authorization: `Token ${apiKey}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.passages?.[0] || "").trim()
    if (!text) return null
    return { text, reference: data.canonical || reference, version: "ESV" }
  } catch {
    return null
  }
}

async function fetchBibleApi(reference: string, translation: string): Promise<VerseResult | null> {
  try {
    const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.text) return null
    return {
      text: data.text.trim(),
      reference: data.reference || reference,
      version: data.translation_name || translation.toUpperCase(),
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  // Validate input parameters
  const params = {
    ref: req.nextUrl.searchParams.get("ref") ?? undefined,
    translation: req.nextUrl.searchParams.get("translation") ?? "esv",
  }

  const validation = validateRequest(bibleVerseSchema, params)
  if (!validation.success) {
    return ApiError.badRequest(validation.error)
  }

  const { ref: reference, translation = "esv" } = validation.data

  let result: VerseResult | null = null

  if (translation === "esv") {
    result = await fetchESV(reference)
    if (!result) {
      result = await fetchBibleApi(reference, "web")
      if (result) result.version = "WEB (ESV unavailable)"
    }
  } else if (translation === "kjv") {
    result = await fetchBibleApi(reference, "kjv")
  } else {
    result = await fetchBibleApi(reference, translation)
  }

  if (!result) {
    return ApiError.notFound("Verse not found")
  }

  return NextResponse.json(result)
}
