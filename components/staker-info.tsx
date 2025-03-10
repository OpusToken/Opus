"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, ExternalLink } from "lucide-react"
import { usePulsechainHolders } from "@/hooks/use-pulsechain-holders"

// Staking contract address
const STAKING_CONTRACT_ADDRESS = "0x7E36b5C2B8D308C651F368DAf2053612E52D1dAe"

export function StakerInfo() {
  const { tokenStats, loading, error } = usePulsechainHolders()
  const [showDetails, setShowDetails] = useState(false)

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

    return ((tokenStats.stakerCount / tokenStats.holderCount) * 100).toFixed(1) + "%"
  }

  // Calculate average stake amount
  const calculateAverageStake = () => {
    if (tokenStats.stakedSupply === null || tokenStats.stakerCount === null || tokenStats.stakerCount === 0) {
      return "N/A"
    }

    const averageStake = Number(tokenStats.stakedSupply) / tokenStats.stakerCount
    return averageStake.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  return (
    <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-foreground text-xl">
          <Wallet className="mr-2 h-5 w-5 text-neon-green" />
          Staker Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-6 bg-muted/20 animate-pulse rounded"></div>
            <div className="h-6 bg-muted/20 animate-pulse rounded"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-background/10 rounded-md">
                <div className="text-sm text-muted-foreground">Total Stakers</div>
                <div className="text-xl font-bold mt-1">{formatNumber(tokenStats.stakerCount)}</div>
                <div className="text-xs text-neon-green mt-1">{calculateStakerPercentage()} of holders</div>
              </div>

              <div className="p-3 bg-background/10 rounded-md">
                <div className="text-sm text-muted-foreground">Average Stake</div>
                <div className="text-xl font-bold mt-1">{calculateAverageStake()}</div>
                <div className="text-xs text-neon-green mt-1">OPUS per staker</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Staker data is derived from blockchain analysis of the staking contract. This includes monitoring
                staking events, analyzing token balances, and querying contract state.
              </p>

              <div className="mt-2">
                <a
                  href={`https://scan.mypinata.cloud/ipfs/bafybeih3olry3is4e4lzm7rus5l3h6zrphcal5a7ayfkhzm5oivjro2cp4/#/address/${STAKING_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-neon-green hover:underline text-xs"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  View staking contract on PulseChain Explorer
                </a>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

