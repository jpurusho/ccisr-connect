/**
 * Types Index
 *
 * Central export point for all shared types.
 * Import from this file for convenience: import { ApiResponse, CardType } from "@/types"
 */

// Re-export all types from submodules
export * from "./api"
export * from "./cards"
export * from "./forms"
export * from "./components"

// Export database types separately to avoid conflicts with application types
// Use: import { Database } from "@/types/supabase" or import type { Tables } from "@/types/supabase"
export type { Database, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes, Constants, Json } from "./supabase"
