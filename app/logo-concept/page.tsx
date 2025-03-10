"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DanteLogo } from "@/components/dante-logo"

export default function LogoConceptPage() {
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

    // Draw Florence cityscape silhouette
    ctx.fillStyle = "rgba(255,255,255,0.1)"
    ctx.beginPath()
    ctx.moveTo(size / 10, size * 0.6)
    for (let i = 1; i <= 10; i++) {
      const x = (size / 10) * i
      const y1 = size * 0.6 - (Math.random() * 30 + 10)
      const y2 = size * 0.6 - (Math.random() * 30 + 10)
      ctx.lineTo(x, y1)
      ctx.lineTo(x + size / 20, y2)
    }
    ctx.lineTo(size, size * 0.6)
    ctx.lineTo(size, size * 0.7)
    ctx.lineTo(0, size * 0.7)
    ctx.closePath()
    ctx.fill()

    // Draw Dante figure
    ctx.fillStyle = "rgba(255,255,255,0.2)"
    ctx.beginPath()
    ctx.arc(size * 0.4, size * 0.4, size / 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "rgba(255,255,255,0.15)"
    ctx.beginPath()
    ctx.moveTo(size * 0.35, size * 0.5)
    ctx.lineTo(size * 0.45, size * 0.5)
    ctx.lineTo(size * 0.45, size * 0.7)
    ctx.lineTo(size * 0.35, size * 0.7)
    ctx.closePath()
    ctx.fill()

    // Draw book (Divine Comedy)
    ctx.fillStyle = "rgba(255,255,255,0.3)"
    ctx.fillRect(size * 0.45, size * 0.5, size * 0.1, size * 0.15)

    // Draw Mount Purgatory
    ctx.fillStyle = "rgba(255, 180, 50, 0.2)"
    ctx.beginPath()
    ctx.moveTo(size * 0.65, size * 0.7)
    ctx.lineTo(size * 0.75, size * 0.4)
    ctx.lineTo(size * 0.85, size * 0.7)
    ctx.closePath()
    ctx.fill()

    // Draw Paradise circles
    ctx.strokeStyle = "rgba(57, 255, 20, 0.3)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(size * 0.75, size * 0.3, size / 10, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = "rgba(57, 255, 20, 0.2)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(size * 0.75, size * 0.3, size / 15, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = "rgba(57, 255, 20, 0.1)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(size * 0.75, size * 0.3, size / 25, 0, Math.PI * 2)
    ctx.stroke()

    // Draw Inferno flames
    ctx.fillStyle = "rgba(255, 50, 50, 0.2)"
    ctx.beginPath()
    ctx.moveTo(size * 0.15, size * 0.7)

    for (let i = 0; i < 5; i++) {
      const x1 = size * 0.15 + (size * 0.15 * i) / 5
      const y1 = size * 0.7 - (Math.random() * 20 + 10)
      const x2 = size * 0.15 + (size * 0.15 * (i + 1)) / 5
      const y2 = size * 0.7 - (Math.random() * 20 + 10)

      ctx.quadraticCurveTo(x1, y1, x2, y2)
    }

    ctx.lineTo(size * 0.3, size * 0.7)
    ctx.closePath()
    ctx.fill()

    // Draw stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size
      const y = Math.random() * size * 0.6
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

    // Draw text "OPUS"
    ctx.fillStyle = "white"
    ctx.font = "bold 48px Space_Grotesk, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("OPUS", size / 2, size * 0.85)

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
            Inspired by Domenico di Michelino's famous fresco of Dante and the Divine Comedy
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col items-center">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-full border-2 border-neon-green/50 shadow-lg shadow-neon-green/20"
                style={{ maxHeight: "400px", maxWidth: "400px" }}
              />
              <p className="mt-4 text-sm text-muted-foreground">Detailed canvas rendering</p>
            </div>

            <div className="flex flex-col items-center space-y-8">
              <div className="flex flex-col items-center">
                <DanteLogo size={200} className="mb-4" />
                <p className="text-sm text-muted-foreground">SVG component version</p>
              </div>

              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  This logo concept is inspired by Domenico di Michelino's famous 1465 fresco "La Commedia illumina
                  Firenze" (The Divine Comedy Illuminating Florence) in Florence Cathedral.
                </p>
                <p>The circular design features key elements from the painting:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Dante holding his Divine Comedy</li>
                  <li>The cityscape of Florence</li>
                  <li>Mount Purgatory in amber</li>
                  <li>The circles of Paradise in neon green</li>
                  <li>The flames of Inferno in red</li>
                </ul>
                <p>
                  The gradient background transitions from deep indigo to PulseChain purple, with the neon green accents
                  highlighting the celestial elements, creating a modern crypto aesthetic while honoring the classical
                  artwork.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

