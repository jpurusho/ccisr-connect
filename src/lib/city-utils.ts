const KNOWN_CITIES: Record<string, string> = {
  "san ramon": "San Ramon",
  "sanramon": "San Ramon",
  "dublin": "Dublin",
  "pleasanton": "Pleasanton",
  "danville": "Danville",
  "livermore": "Livermore",
  "walnut creek": "Walnut Creek",
  "walnutcreek": "Walnut Creek",
  "castro valley": "Castro Valley",
  "castrovalley": "Castro Valley",
  "fremont": "Fremont",
  "hayward": "Hayward",
  "san jose": "San Jose",
  "sanjose": "San Jose",
  "sunnyvale": "Sunnyvale",
  "milpitas": "Milpitas",
  "tracy": "Tracy",
  "mountain house": "Mountain House",
  "mountainhouse": "Mountain House",
  "union city": "Union City",
  "unioncity": "Union City",
  "newark": "Newark",
  "santa clara": "Santa Clara",
  "santaclara": "Santa Clara",
  "cupertino": "Cupertino",
  "san leandro": "San Leandro",
  "sanleandro": "San Leandro",
  "concord": "Concord",
  "antioch": "Antioch",
  "brentwood": "Brentwood",
  "oakley": "Oakley",
  "pittsburg": "Pittsburg",
  "alameda": "Alameda",
  "oakland": "Oakland",
  "berkeley": "Berkeley",
  "pleasanthill": "Pleasant Hill",
  "pleasant hill": "Pleasant Hill",
  "martinez": "Martinez",
  "alamo": "Alamo",
  "discovery bay": "Discovery Bay",
  "discoverybay": "Discovery Bay",
}

export function canonicalCityName(rawCity: string | null): string {
  if (!rawCity) return "Unknown"
  const key = rawCity.toLowerCase().trim().replace(/\s+/g, " ")
  const noSpaces = key.replace(/\s/g, "")

  if (KNOWN_CITIES[key]) return KNOWN_CITIES[key]
  if (KNOWN_CITIES[noSpaces]) return KNOWN_CITIES[noSpaces]

  return key.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function buildCityList(rawCities: (string | null)[]): string[] {
  const seen = new Set<string>()
  for (const raw of rawCities) {
    seen.add(canonicalCityName(raw))
  }
  const list = [...seen].filter((c) => c !== "Unknown")
  list.sort((a, b) => a.localeCompare(b))
  return list
}
