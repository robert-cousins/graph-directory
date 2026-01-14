import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateHeroImages() {
  try {
    console.log("[v0] Starting hero image update...")

    // First, check what we have
    const { data: currentData, error: fetchError } = await supabase.from("plumbers").select("id, name, hero_image")

    if (fetchError) {
      console.error("[v0] Error fetching current data:", fetchError)
      return
    }

    console.log("[v0] Current hero images:")
    currentData.forEach((plumber) => {
      console.log(`  ${plumber.name}: ${plumber.hero_image}`)
    })

    // Update all records where hero_image contains placeholder.svg
    const { data, error } = await supabase
      .from("plumbers")
      .update({ hero_image: "/images/plumber-business-hero.png" })
      .like("hero_image", "%placeholder.svg%")
      .select("id, name, hero_image")

    if (error) {
      console.error("[v0] Error updating hero images:", error)
      return
    }

    console.log(`[v0] Successfully updated ${data.length} plumber records:`)
    data.forEach((plumber) => {
      console.log(`  ${plumber.name}: ${plumber.hero_image}`)
    })

    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase.from("plumbers").select("id, name, hero_image")

    if (verifyError) {
      console.error("[v0] Error verifying update:", verifyError)
      return
    }

    console.log("[v0] Final verification - all hero images:")
    verifyData.forEach((plumber) => {
      console.log(`  ${plumber.name}: ${plumber.hero_image}`)
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
  }
}

updateHeroImages()
