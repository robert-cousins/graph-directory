import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkPlumbersData() {
  try {
    console.log("Checking plumbers data in database...")

    // Get all plumbers
    const { data: plumbers, error } = await supabase.from("plumbers").select("id, name, slug, suburb").order("id")

    if (error) {
      console.error("Error fetching plumbers:", error)
      return
    }

    console.log(`Found ${plumbers?.length || 0} plumbers in database:`)

    if (plumbers && plumbers.length > 0) {
      plumbers.forEach((plumber, index) => {
        console.log(`${index + 1}. ${plumber.name} (${plumber.suburb})`)
        console.log(`   Slug: ${plumber.slug}`)
        console.log(`   URL: /plumber/${plumber.slug}`)
        console.log("")
      })
    } else {
      console.log("No plumbers found in database!")
      console.log("You may need to run the seeding script.")
    }
  } catch (error) {
    console.error("Script error:", error)
  }
}

checkPlumbersData()
