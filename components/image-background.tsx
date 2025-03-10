"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

export function ImageBackground() {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    setOpacity(0.7) // Fade in the background
  }, [])

  return (
    <div className="fixed inset-0 -z-10">
      <div
        className="absolute inset-0 bg-gradient-to-br from-deep-indigo to-pulse-purple"
        style={{ mixBlendMode: "multiply" }}
      />
      <Image
        src="/crypto-background.jpg" // You would need to add this image to your public folder
        alt="Background"
        fill
        priority
        className="object-cover"
        style={{
          opacity,
          transition: "opacity 1s ease-in-out",
          filter: "brightness(0.4) contrast(1.2) saturate(0.8)",
        }}
      />
      <div className="absolute inset-0 bg-deep-indigo/30" style={{ mixBlendMode: "color" }} />
    </div>
  )
}

