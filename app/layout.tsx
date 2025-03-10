import type React from "react"
import type { Metadata } from "next"
import { Inter, Sacramento } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { NetworkBackground } from "@/components/network-background"
import { BlockchainProvider } from "@/contexts/blockchain-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
})

const sacramento = Sacramento({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-sacramento",
})

export const metadata: Metadata = {
  title: "Opus Token",
  description: "The official website for Opus Token",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${sacramento.variable} font-sans min-h-screen relative overflow-x-hidden`}>
        <BlockchainProvider>
          <NetworkBackground />
          <div className="absolute top-[20%] left-[-10%] w-[120%] h-[80%] bg-neon-green/5 blur-[150px] rounded-full -z-10 opacity-30"></div>
          <div className="absolute top-[60%] right-[-5%] w-[40%] h-[40%] bg-neon-green/10 blur-[100px] rounded-full -z-10 opacity-20"></div>
          <Header />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
          <Toaster />
        </BlockchainProvider>
      </body>
    </html>
  )
}



import './globals.css'