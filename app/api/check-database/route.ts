import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase.from("plumbers").select("id, name, hero_image").order("id")

    if (error) {
      console.error("[v0] Database check error:", error)
      return NextResponse.json({ error: "Failed to check database" }, { status: 500 })
    }

    return NextResponse.json({
      totalRecords: data?.length || 0,
      records: data?.map((record) => ({
        id: record.id,
        name: record.name,
        heroImage: record.hero_image,
      })),
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
