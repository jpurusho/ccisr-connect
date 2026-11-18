import { NextResponse } from 'next/server'

/**
 * Migration endpoint - provides instructions
 */
export async function GET() {
  return NextResponse.json({
    message: 'Migration 00063: Add instance subject override',
    instructions: 'Run the SQL from supabase/migrations/00063_add_instance_subject_override.sql in your Supabase SQL editor',
    sql: `
ALTER TABLE event_instances
  ADD COLUMN IF NOT EXISTS instance_subject text,
  ADD COLUMN IF NOT EXISTS instance_subject_prefix text;
    `.trim()
  })
}
