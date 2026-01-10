import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

/**
 * DISABLED: Legacy maintenance route that updated public.plumbers table
 *
 * Phase 3: Legacy plumbers table is READ-ONLY for backward compatibility.
 * Hero images for new businesses are set during submission via:
 * /list-your-business → submitBusinessAction → createBusinessSubmission
 *
 * To update hero images for businesses in the new schema, create a new
 * admin route that updates the businesses table (not plumbers).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "This API route is disabled. Legacy plumbers table is read-only.",
      message: "For new businesses, hero images are managed through the edit flow."
    },
    { status: 403 }
  )
}
