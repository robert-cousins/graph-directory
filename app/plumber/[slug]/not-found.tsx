import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Plumber Not Found</h1>
          <p className="text-lg text-gray-600 mb-8">
            Sorry, we couldn&apos;t find the plumber you&apos;re looking for.
          </p>
          <Link href="/plumbers">
            <Button>Browse All Plumbers</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
