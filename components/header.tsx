"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { OpusLogo } from "./opus-logo"
import { WalletConnect } from "./wallet-connect"

export function Header() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const routes = [
    { name: "Home", path: "/" },
    { name: "Stake", path: "/stake" },
    { name: "Statistics", path: "/statistics" },
    { name: "Purplepaper", path: "/purplepaper" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/5 backdrop-blur-lg supports-[backdrop-filter]:bg-background/5">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <OpusLogo size={40} />
          <span className="text-3xl font-normal font-sacramento text-white">Opus</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          {routes.map((route) => (
            <Link
              key={route.path}
              href={route.path}
              className={`text-sm font-bold transition-colors hover:text-neon-green ${
                pathname === route.path ? "text-neon-green" : "text-muted-foreground"
              }`}
            >
              {route.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <WalletConnect />
        </div>

        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="container md:hidden py-4">
          <nav className="flex flex-col gap-4">
            {routes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                className={`text-sm font-bold transition-colors hover:text-neon-green ${
                  pathname === route.path ? "text-neon-green" : "text-muted-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {route.name}
              </Link>
            ))}
            <div className="mt-2 w-full">
              <WalletConnect />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

