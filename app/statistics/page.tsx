"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart, Flame, Users, Wallet, Lock, ExternalLink } from "lucide-react"
import { HolderCountInfo } from "@/components/holder-count-info"
import { usePulsechainHolders } from "@/hooks/use-pulsechain-holders"

// Declare the TOKEN_CONTRACT_ADDRESS variable
const TOKEN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || ""

export default function StatisticsPage() {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const { tokenStats, loading, error } = usePulsechainHolders()

  // Calculate percentages for the chart
  // Use actual data if available, otherwise use fixed values
  const percentStaked =
    tokenStats.stakedSupply !== null
      ? ((Number(tokenStats.stakedSupply) / Number(tokenStats.totalSupply)) * 100).toFixed(2)
      : "5.00" // Fixed fallback value

  const percentLocked =
    tokenStats.lockedSupply !== null
      ? ((Number(tokenStats.lockedSupply) / Number(tokenStats.totalSupply)) * 100).toFixed(2)
      : "2.50" // Fixed fallback value

  const percentBurned = ((Number(tokenStats.burnedSupply) / Number(tokenStats.totalSupply)) * 100).toFixed(2)

  // Update the supplyData to handle potential NaN values
  const supplyData = [
    {
      name: "Held",
      value: Number.isNaN(
        Number.parseFloat(
          (
            100 -
            Number.parseFloat(percentStaked) -
            Number.parseFloat(percentLocked) -
            Number.parseFloat(percentBurned)
          ).toFixed(2),
        ),
      )
        ? 90.3 // Fallback value if calculation results in NaN
        : Number.parseFloat(
            (
              100 -
              Number.parseFloat(percentStaked) -
              Number.parseFloat(percentLocked) -
              Number.parseFloat(percentBurned)
            ).toFixed(2),
          ),
      color: "#6B48FF",
    },
    {
      name: "Staked",
      value: Number.isNaN(Number.parseFloat(percentStaked)) ? 5.0 : Number.parseFloat(percentStaked),
      color: "#39FF14",
    },
    {
      name: "Staked and locked",
      value: Number.isNaN(Number.parseFloat(percentLocked)) ? 2.5 : Number.parseFloat(percentLocked),
      color: "#14D9FF",
    },
    {
      name: "Burned",
      value: Number.isNaN(Number.parseFloat(percentBurned)) ? 1.2 : Number.parseFloat(percentBurned),
      color: "#FF5733",
    },
    { name: "Liquidity", value: 1.0, color: "#FFD700" }, // Fixed value
  ]

  // Format numbers for display
  const formatNumber = (num: string | number | null) => {
    if (num === null) return "N/A"

    const numValue = typeof num === "string" ? Number.parseFloat(num) : num

    return numValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  // Calculate percentage of holders who are stakers
  const calculateStakerPercentage = () => {
    if (tokenStats.holderCount === null || tokenStats.stakerCount === null) {
      return "N/A"
    }

    return ((tokenStats.stakerCount / tokenStats.holderCount) * 100).toFixed(0) + "%"
  }

  // Calculate staked supply
  const getStakedSupply = () => {
    if (tokenStats.stakedSupply !== null) {
      return formatNumber(tokenStats.stakedSupply)
    }
    return "N/A"
  }

  // Calculate staked percentage
  const getStakedPercentage = () => {
    if (tokenStats.stakedSupply !== null) {
      return ((Number(tokenStats.stakedSupply) / Number(tokenStats.totalSupply)) * 100).toFixed(2) + "%"
    }
    return "N/A"
  }

  // Calculate locked supply
  const getLockedSupply = () => {
    if (tokenStats.lockedSupply !== null) {
      return formatNumber(tokenStats.lockedSupply)
    }
    return "N/A"
  }

  // Calculate locked percentage
  const getLockedPercentage = () => {
    if (tokenStats.lockedSupply !== null) {
      return ((Number(tokenStats.lockedSupply) / Number(tokenStats.totalSupply)) * 100).toFixed(2) + "%"
    }
    return "N/A"
  }

  useEffect(() => {
    const canvas = chartRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = 300
    canvas.height = 300

    // Draw pie chart
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) * 0.8

    let startAngle = 0

    // Draw each segment
    supplyData.forEach((segment) => {
      const segmentAngle = (segment.value / 100) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + segmentAngle)
      ctx.closePath()

      ctx.fillStyle = segment.color
      ctx.fill()

      // Add segment label
      const labelAngle = startAngle + segmentAngle / 2
      const labelRadius = radius * 0.7
      const labelX = centerX + Math.cos(labelAngle) * labelRadius
      const labelY = centerY + Math.sin(labelAngle) * labelRadius

      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Only add label if segment is large enough
      if (segment.value > 5) {
        ctx.fillText(`${segment.value}%`, labelX, labelY)
      }

      startAngle += segmentAngle
    })

    // Add center circle for better aesthetics
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI)
    ctx.fillStyle = "#1a1a1a"
    ctx.fill()
  }, [tokenStats]) // Added tokenStats as a dependency to redraw when data changes

  return (
    <div className="container py-10">
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4 mb-6">
          <p className="text-amber-400 text-sm">
            <strong>Note:</strong> {error}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tighter md:text-4xl text-foreground">Opus Token Statistics</h1>
          <p className="text-muted-foreground">Real-time metrics and distribution data for Opus Token</p>
        </div>

        {/* Key Statistics Cards - Reordered as requested */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {/* First row: Holders and Stakers */}
          <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-foreground text-xl">
                <Users className="mr-2 h-5 w-5 text-neon-green" />
                Holders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted/20 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(tokenStats.holderCount)}</p>
                  <p className="text-sm text-muted-foreground">
                    <a
                      href={`https://scan.mypinata.cloud/ipfs/bafybeih3olry3is4e4lzm7rus5l3h6zrphcal5a7ayfkhzm5oivjro2cp4/#/token/${TOKEN_CONTRACT_ADDRESS}?tab=holders`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon-green hover:underline flex items-center"
                    >
                      <span>View all holders</span>
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-foreground text-xl">
                <Wallet className="mr-2 h-5 w-5 text-neon-green" />
                Stakers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted/20 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(tokenStats.stakerCount)}</p>
                  <p className="text-sm text-muted-foreground">{calculateStakerPercentage()} of holders</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Second row: Total Supply and Burned Supply */}
          <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-foreground text-xl">
                <BarChart3 className="mr-2 h-5 w-5 text-neon-green" />
                Total Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted/20 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(tokenStats.totalSupply)}</p>
                  <p className="text-sm text-muted-foreground">{tokenStats.symbol}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-foreground text-xl">
                <Flame className="mr-2 h-5 w-5 text-red-500" />
                Burned Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted/20 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(tokenStats.burnedSupply)}</p>
                  <p className="text-sm text-muted-foreground">
                    {((Number(tokenStats.burnedSupply) / Number(tokenStats.totalSupply)) * 100).toFixed(2)}% of total
                    supply
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Third row: Staked Supply and Staked & Locked Supply */}
          <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-foreground text-xl">
                <Wallet className="mr-2 h-5 w-5 text-neon-green" />
                Staked Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted/20 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{getStakedSupply()}</p>
                  <p className="text-sm text-muted-foreground">{getStakedPercentage()} of total supply</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-foreground text-xl">
                <Lock className="mr-2 h-5 w-5 text-blue-400" />
                Staked & Locked Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted/20 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{getLockedSupply()}</p>
                  <p className="text-sm text-muted-foreground">{getLockedPercentage()} of total supply</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Fourth row: Circulating Supply */}
          <Card className="bg-background/20 backdrop-blur-md border-neon-green/10 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-foreground text-xl">
                <BarChart3 className="mr-2 h-5 w-5 text-neon-green" />
                Circulating Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted/20 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(tokenStats.circulatingSupply)}</p>
                  <p className="text-sm text-muted-foreground">
                    {((Number(tokenStats.circulatingSupply) / Number(tokenStats.totalSupply)) * 100).toFixed(0)}% of
                    total supply
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Holder Count Info Component */}
        <HolderCountInfo />

        {/* Supply Distribution Chart */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <PieChart className="mr-2 h-5 w-5 text-neon-green" />
                Supply Distribution
              </CardTitle>
              <CardDescription>Breakdown of Opus token allocation</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative">
                <canvas ref={chartRef} width={300} height={300} className="mb-4"></canvas>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-4">
                {supplyData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-foreground">
                      {item.name}: {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

