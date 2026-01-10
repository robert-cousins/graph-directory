import Link from "next/link"
import { Search, MapPin, Phone, Star, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/plumber-hero.png')",
          }}
        />
        <div className="absolute inset-0 bg-blue-900/70" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              Find Trusted Plumbers in <span className="text-blue-200">Melville & Myaree, WA</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 text-blue-100 max-w-3xl mx-auto leading-relaxed px-4">
              Connect with reliable, professional plumbers in your local area. Emergency repairs, blocked drains, and
              quality service you can trust across both suburbs.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search services or business name..."
                  className="pl-10 pr-12 py-3 sm:py-4 text-base sm:text-lg bg-white text-gray-900 border-0 shadow-lg"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Link href="/plumbers">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold shadow-lg"
              >
                Browse All Plumbers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Directory?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We connect Melville and Myaree residents with trusted, verified plumbing professionals who deliver quality
              service when you need it most.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6 border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Verified Reviews</h3>
                <p className="text-gray-600">
                  Real customer reviews and ratings to help you make informed decisions about your plumbing needs.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">24/7 Emergency</h3>
                <p className="text-gray-600">
                  Find plumbers available for emergency callouts, with clear availability and response times.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Local Experts</h3>
                <p className="text-gray-600">
                  Connect with experienced plumbers who know Melville, Myaree and surrounding areas inside and out.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Plumbing Services</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find specialists for all your plumbing needs in Melville and Myaree
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              "Emergency Repairs",
              "Blocked Drains",
              "Hot Water Systems",
              "Bathroom Renovations",
              "Gas Fitting",
              "Leak Detection",
            ].map((service) => (
              <Link
                key={service}
                href="/plumbers"
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center border border-gray-200 hover:border-blue-300"
              >
                <p className="font-medium text-gray-900 text-sm">{service}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Plumber?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Browse our directory of trusted professionals and get your plumbing issues resolved quickly.
          </p>
          <Link href="/plumbers">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
              View All Plumbers
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Melville & Myaree Plumbers</h3>
              <p className="text-gray-400">
                Your trusted directory for finding reliable plumbing services in Melville and Myaree, Western Australia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/plumbers" className="hover:text-white">
                    Find Plumbers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Emergency Services
                  </Link>
                </li>
                <li>
                  <Link href="/list-your-business" className="hover:text-white">
                    List Your Business
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                Melville & Myaree, Western Australia
                <br />
                info@melvilleplumbers.com.au
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Melville & Myaree Plumbers Directory. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
