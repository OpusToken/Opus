import Link from "next/link"
import { Twitter } from "lucide-react"
import { OpusLogo } from "./opus-logo"

export function Footer() {
  return (
    <footer className="border-t border-neon-green/10 bg-background/20 backdrop-blur-md">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <OpusLogo size={36} />
              <span className="text-2xl font-normal font-sacramento text-white">Opus</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="https://x.com/OpusTokenWin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-neon-green transition-colors"
            >
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center md:text-left">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Opus Token. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

