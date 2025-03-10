"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DanteLogoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 500
    canvas.width = size
    canvas.height = size

    // Draw background
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, "#4B0082") // Deep indigo
    gradient.addColorStop(1, "#6B48FF") // PulseChain purple

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw the three realms as concentric circles
    // Inferno (Hell) - innermost circle
    ctx.strokeStyle = "rgba(255, 50, 50, 0.5)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 5, 0, Math.PI * 2)
    ctx.stroke()

    // Purgatorio (Purgatory) - middle circle
    ctx.strokeStyle = "rgba(255, 180, 50, 0.5)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2)
    ctx.stroke()

    // Paradiso (Heaven) - outer circle
    ctx.strokeStyle = "rgba(57, 255, 20, 0.5)" // Neon green
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 20, 0, Math.PI * 2)
    ctx.stroke()

    // Draw stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const radius = Math.random() * 1.5 + 0.5

      // Check if the star is within the circle
      const dx = x - size / 2
      const dy = y - size / 2
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < size / 2) {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw a simplified Dante silhouette
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)"
    ctx.beginPath()
    ctx.moveTo(size / 2, size / 2 - 50)
    ctx.quadraticCurveTo(size / 2 - 40, size / 2, size / 2 - 30, size / 2 + 70)
    ctx.lineTo(size / 2 + 30, size / 2 + 70)
    ctx.quadraticCurveTo(size / 2 + 40, size / 2, size / 2, size / 2 - 50)
    ctx.fill()

    // Draw text "OPUS"
    ctx.fillStyle = "white"
    ctx.font = "bold 48px Space_Grotesk, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("OPUS", size / 2, size / 2 + 120)

    // Draw border
    ctx.strokeStyle = "rgba(57, 255, 20, 0.8)" // Neon green
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()
  }, [])

  return (
    <div className="container py-10">
      <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
        <CardHeader>
          <CardTitle>Opus Token Logo Concept</CardTitle>
          <CardDescription>
            Inspired by Dante's Divine Comedy, featuring the three realms: Inferno, Purgatorio, and Paradiso
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-full border-2 border-neon-green/50 shadow-lg shadow-neon-green/20"
            style={{ maxHeight: "500px", maxWidth: "500px" }}
          />
          <p className="mt-6 text-muted-foreground text-sm max-w-2xl text-center">
            This logo concept draws inspiration from Dante Alighieri's Divine Comedy, featuring concentric circles
            representing the three realms: Inferno (inner red circle), Purgatorio (middle amber circle), and Paradiso
            (outer neon green circle). The silhouette represents Dante's journey through these realms, set against a
            cosmic background with stars, symbolizing the celestial nature of the poem.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

