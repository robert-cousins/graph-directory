"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-600">Melville Plumbers</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/plumbers" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Find Plumbers
            </Link>
            <Link href="/list-your-business">
              <Button variant="outline" size="sm" className="bg-transparent">
                List Your Business
              </Button>
            </Link>
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-4">
                  <Link
                    href="/plumbers"
                    className="block text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Find Plumbers
                  </Link>
                  <Link
                    href="#"
                    className="block text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Emergency Services
                  </Link>
                  <Link
                    href="/list-your-business"
                    className="block text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    List Your Business
                  </Link>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-3">Need immediate help?</p>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <Phone className="h-4 w-4 mr-2" />
                      Emergency Plumber
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
