import { NextResponse } from "next/server"

/**
 * DISABLED: Legacy test route that wrote to public.plumbers table
 *
 * Phase 3: All new business submissions now use the normalized schema:
 * - businesses table (with edit tokens)
 * - credentials table
 * - business_services junction table
 * - business_service_areas junction table
 *
 * Legacy plumbers table is READ-ONLY for backward compatibility.
 * New submissions go through /list-your-business → submitBusinessAction → createBusinessSubmission
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "This API route is disabled. Legacy plumbers table is read-only.",
      message: "Use /list-your-business for new business submissions."
    },
    { status: 403 }
  )
}
