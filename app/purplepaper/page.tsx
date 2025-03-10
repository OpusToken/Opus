"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

export default function PurplepaperPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // This is where you would typically fetch the content
    // For demonstration purposes, we're just setting a timeout
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="container py-10">
      <Card className="bg-background/20 backdrop-blur-md border-neon-green/10 p-8 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[500px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-green"></div>
          </div>
        ) : (
          <div className="w-full">
            <iframe
              src="https://drive.google.com/file/d/1p2kSd4tBF0mA-V8vhJGB9mOeRJHBvEDDccycjIlM9B0/preview"
              className="w-full min-h-[800px] border-0"
              title="Opus Token Purplepaper"
              allow="autoplay"
            ></iframe>
          </div>
        )}
      </Card>
    </div>
  )
}

