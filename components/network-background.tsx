"use client"

import { useEffect, useRef } from "react"

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Node properties
    let nodes: Node[] = []
    const nodeCount = 100
    const connectionDistance = 150

    class Node {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      opacity: number

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 2 + 1
        this.speedX = (Math.random() - 0.5) * 0.5
        this.speedY = (Math.random() - 0.5) * 0.5

        // Create colors in the purple/indigo range
        const r = Math.floor(Math.random() * 50 + 75)
        const g = Math.floor(Math.random() * 30 + 20)
        const b = Math.floor(Math.random() * 100 + 155)
        this.color = `rgb(${r}, ${g}, ${b})`
        this.opacity = Math.random() * 0.5 + 0.3
      }

      update() {
        // Move nodes
        this.x += this.speedX
        this.y += this.speedY

        // Bounce off edges
        if (this.x > canvas.width || this.x < 0) {
          this.speedX = -this.speedX
        }
        if (this.y > canvas.height || this.y < 0) {
          this.speedY = -this.speedY
        }
      }

      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.globalAlpha = this.opacity
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // Initialize nodes
    const initNodes = () => {
      nodes = []
      for (let i = 0; i < nodeCount; i++) {
        nodes.push(new Node())
      }
    }

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // Redraw when resized
      initNodes()
    }

    // Initial setup
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Draw connections between nodes
    const drawConnections = () => {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < connectionDistance) {
            // Calculate opacity based on distance
            const opacity = 1 - distance / connectionDistance

            // Draw line with gradient
            const gradient = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)
            gradient.addColorStop(0, `rgba(107, 72, 255, ${opacity * 0.5})`) // PulseChain purple
            gradient.addColorStop(1, `rgba(57, 255, 20, ${opacity * 0.3})`) // Neon green

            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = gradient
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
    }

    // Draw background gradient
    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "#2D0A4E") // Deep indigo
      gradient.addColorStop(1, "#4B0082") // Indigo
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw background
      drawBackground()

      // Update and draw nodes
      nodes.forEach((node) => {
        node.update()
        node.draw()
      })

      // Draw connections
      drawConnections()

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10" />
}

