import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { ApiError } from "./api-response"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface AuthResult {
  authorized: boolean
  userId?: string
  role?: string
  error?: ReturnType<typeof ApiError.unauthorized>
}

/**
 * Verify the request has a valid Bearer token and the user exists.
 * Returns user ID and role if successful.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: ApiError.unauthorized("Missing or invalid Authorization header"),
    }
  }

  const token = authHeader.slice(7)
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  const { data: { user }, error: userErr } = await adminClient.auth.getUser(token)
  if (userErr || !user) {
    return {
      authorized: false,
      error: ApiError.unauthorized("Invalid or expired token"),
    }
  }

  // Fetch user role from app_users table
  const { data: appUser } = await adminClient
    .from("app_users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (!appUser || !appUser.is_active) {
    return {
      authorized: false,
      error: ApiError.forbidden("User is not active"),
    }
  }

  return {
    authorized: true,
    userId: user.id,
    role: appUser.role as string,
  }
}

/**
 * Verify the user is an admin (super_admin or admin role).
 */
export async function verifyAdmin(req: NextRequest): Promise<AuthResult> {
  const auth = await verifyAuth(req)
  if (!auth.authorized) {
    return auth
  }

  if (auth.role !== "super_admin" && auth.role !== "admin") {
    return {
      authorized: false,
      error: ApiError.forbidden("Admin access required"),
    }
  }

  return auth
}

/**
 * Verify the user is a super admin.
 */
export async function verifySuperAdmin(req: NextRequest): Promise<AuthResult> {
  const auth = await verifyAuth(req)
  if (!auth.authorized) {
    return auth
  }

  if (auth.role !== "super_admin") {
    return {
      authorized: false,
      error: ApiError.forbidden("Super admin access required"),
    }
  }

  return auth
}

/**
 * Verify the user can access a specific resource.
 * This is a flexible helper that can be extended for resource-level authorization.
 */
export async function canAccessResource(
  req: NextRequest,
  resourceType: string,
  resourceId: string
): Promise<AuthResult> {
  const auth = await verifyAuth(req)
  if (!auth.authorized) {
    return auth
  }

  // Admins can access everything
  if (auth.role === "super_admin" || auth.role === "admin") {
    return auth
  }

  // Add resource-specific logic here
  // For example: check if user owns the resource, or has been granted access
  // This is a placeholder for future expansion
  switch (resourceType) {
    case "signup_response":
      // Example: verify the user owns this signup response
      // Could check member_id matches user's member record
      return {
        authorized: false,
        error: ApiError.forbidden("You do not have access to this resource"),
      }
    default:
      return {
        authorized: false,
        error: ApiError.forbidden("Access denied"),
      }
  }
}
