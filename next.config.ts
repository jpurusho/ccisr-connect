import type { NextConfig } from "next"
import { execSync } from "child_process"
import { readFileSync } from "fs"

function getAppVersion(): string {
  const pkgVersion = JSON.parse(readFileSync("package.json", "utf8")).version as string
  try {
    const described = execSync("git describe --tags --always", { encoding: "utf8" }).trim()
    // If git describe found a tag (starts with v + digit), strip the v and use it
    // Otherwise (shallow clone with no reachable tag) fall back to package.json version
    return /^v\d/.test(described) ? described.replace(/^v/, "") : pkgVersion
  } catch {
    return pkgVersion
  }
}

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersion(),
  },
}

export default nextConfig
