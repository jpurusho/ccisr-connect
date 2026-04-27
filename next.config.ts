import type { NextConfig } from "next"
import { execSync } from "child_process"

function getAppVersion(): string {
  try {
    return execSync("git describe --tags --always", { encoding: "utf8" }).trim()
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown"
  }
}

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersion(),
  },
}

export default nextConfig
