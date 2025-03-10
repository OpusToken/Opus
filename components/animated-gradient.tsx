"use client"

import { useEffect, useRef } from "react"

export function AnimatedGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Create gradient points
    const gradientPoints = [
      { x: 0, y: 0, color: "#4B0082", targetX: 0, targetY: 0 }, // Deep indigo
      { x: canvas.width, y: 0, color: "#6A0DAD", targetX: canvas.width, targetY: 0 }, // Purple
      { x: canvas.width, y: canvas.height, color: "#6B48FF", targetX: canvas.width, targetY: canvas.height }, // PulseChain purple
      { x: 0, y: canvas.height, color: "#483D8B", targetX: 0, targetY: canvas.height }, // Dark slate blue
    ]

    // Animation variables
    let animationFrame: number
    let lastTime = 0
    const fps = 30
    const interval = 1000 / fps
    const speed = 0.01

    // Update gradient points
    const updatePoints = () => {
      gradientPoints.forEach((point) => {
        // Randomly change target positions slightly
        if (Math.random() < 0.01) {
          point.targetX = point.x + (Math.random() * 200 - 100)
          point.targetY = point.y + (Math.random() * 200 - 100)

          // Keep targets within bounds
          point.targetX = Math.max(0, Math.min(canvas.width, point.targetX))
          point.targetY = Math.max(0, Math.min(canvas.height, point.targetY))
        }

        // Move points toward targets
        point.x += (point.targetX - point.x) * speed
        point.y += (point.targetY - point.y) * speed
      })
    }

    // Draw gradient
    const drawGradient = () => {
      // Create a temporary canvas for the gradient
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext("2d")
      if (!tempCtx) return

      // Create a path from the points
      tempCtx.beginPath()
      tempCtx.moveTo(gradientPoints[0].x, gradientPoints[0].y)

      for (let i = 1; i < gradientPoints.length; i++) {
        tempCtx.lineTo(gradientPoints[i].x, gradientPoints[i].y)
      }

      tempCtx.closePath()

      // Create gradient
      const gradient = tempCtx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, gradientPoints[0].color)
      gradient.addColorStop(0.33, gradientPoints[1].color)
      gradient.addColorStop(0.66, gradientPoints[2].color)
      gradient.addColorStop(1, gradientPoints[3].color)

      tempCtx.fillStyle = gradient
      tempCtx.fill()

      // Apply blur effect
      tempCtx.filter = "blur(80px)"
      tempCtx.globalCompositeOperation = "source-over"
      tempCtx.drawImage(tempCanvas, 0, 0)

      // Draw the result to the main canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(tempCanvas, 0, 0)

      // Add subtle noise texture
      addNoiseTexture()
    }

    // Add noise texture
    const addNoiseTexture = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        // Add very subtle noise
        const noise = Math.random() * 10 - 5
        data[i] = Math.max(0, Math.min(255, data[i] + noise))
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
      }

      ctx.putImageData(imageData, 0, 0)
    }

    // Animation loop
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTime

      if (deltaTime >= interval) {
        lastTime = timestamp - (deltaTime % interval)
        updatePoints()
        drawGradient()
      }

      animationFrame = requestAnimationFrame(animate)
    }

    animate(0)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10" />
}

