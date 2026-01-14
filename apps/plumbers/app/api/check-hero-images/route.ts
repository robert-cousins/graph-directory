import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Get all plumbers and their hero images
    const { data: plumbers, error } = await supabase.from("plumbers").select("id, name, hero_image").order("id")

    if (error) {
      console.error("[v0] Error fetching plumbers:", error)
      return NextResponse.json({ error: "Failed to fetch plumbers" }, { status: 500 })
    }

    const placeholderCount = plumbers?.filter((p) => p.hero_image?.includes("placeholder.svg")).length || 0
    const correctImageCount = plumbers?.filter((p) => p.hero_image?.includes("plumber-business-hero.png")).length || 0

    return NextResponse.json({
      total: plumbers?.length || 0,
      placeholderCount,
      correctImageCount,
      plumbers: plumbers?.map((p) => ({
        id: p.id,
        name: p.name,
        hero_image: p.hero_image,
      })),
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
