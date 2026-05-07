import { NextRequest, NextResponse } from "next/server"

const ESV_API_KEY = process.env.ESV_API_KEY || ""

interface VerseResult {
  text: string
  reference: string
  translation: string
}

async function fetchESV(reference: string): Promise<VerseResult | null> {
  if (!ESV_API_KEY) return null
  try {
    const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(reference)}&include-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false&include-passage-references=false&indent-paragraphs=0`
    const res = await fetch(url, {
      headers: { Authorization: `Token ${ESV_API_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.passages?.[0] || "").trim()
    if (!text) return null
    return { text, reference: data.canonical || reference, translation: "ESV" }
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
      translation: data.translation_name || translation.toUpperCase(),
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("ref")
  const translation = req.nextUrl.searchParams.get("translation") || "esv"

  if (!reference) {
    return NextResponse.json({ error: "ref parameter required" }, { status: 400 })
  }

  let result: VerseResult | null = null

  if (translation === "esv") {
    result = await fetchESV(reference)
    if (!result) {
      result = await fetchBibleApi(reference, "web")
      if (result) result.translation = "WEB (ESV unavailable)"
    }
  } else if (translation === "kjv") {
    result = await fetchBibleApi(reference, "kjv")
  } else {
    result = await fetchBibleApi(reference, translation)
  }

  if (!result) {
    return NextResponse.json({ error: "Verse not found" }, { status: 404 })
  }

  return NextResponse.json(result)
}
