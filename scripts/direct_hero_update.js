import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateAllHeroImages() {
  console.log("Starting hero image update...")

  // Update all records that have placeholder.svg in hero_image
  const { data, error } = await supabase
    .from("plumbers")
    .update({ hero_image: "/images/plumber-business-hero.png" })
    .like("hero_image", "%placeholder.svg%")
    .select("name, hero_image")

  if (error) {
    console.error("Error updating hero images:", error)
    return
  }

  console.log(`Successfully updated ${data?.length || 0} plumber records`)
  console.log("Updated plumbers:", data)

  // Verify the update
  const { data: allPlumbers, error: fetchError } = await supabase
    .from("plumbers")
    .select("name, hero_image")
    .order("name")

  if (fetchError) {
    console.error("Error fetching updated data:", fetchError)
    return
  }

  console.log(`Total plumbers in database: ${allPlumbers?.length || 0}`)
  console.log(
    "All hero images:",
    allPlumbers?.map((p) => ({ name: p.name, heroImage: p.hero_image })),
  )
}

updateAllHeroImages()
