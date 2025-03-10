"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

// Get token contract address from environment variable with fallback
const TOKEN_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || "0x64aa120986030627C3E1419B09ce604e21B9B0FE"

export function HolderCountInfo() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-foreground text-xl">
          <Info className="mr-2 h-5 w-5 text-blue-400" />
          About Token Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">
          The token statistics shown are based on multiple data sources including blockchain data and PulseChain
          Explorer. When data cannot be fetched from these sources, "N/A" is displayed rather than using estimates.
        </p>

        {isExpanded && (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>Our statistics are gathered using a multi-layered approach:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>PulseChain Explorer REST API (when available)</li>
              <li>Direct blockchain RPC calls to analyze token transfers</li>
              <li>Staking contract event analysis for staker counts</li>
              <li>If data cannot be retrieved, "N/A" is displayed</li>
            </ol>

            <p className="mt-2">For holder and staker counts, we analyze blockchain data including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Token transfer events to identify unique addresses</li>
              <li>Staking contract events (Staked/Unstaked) to track active stakers</li>
              <li>Direct contract state queries when available</li>
            </ul>

            <p className="mt-2">For staked and locked supply data, we use:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Direct queries to the staking contract using multiple method signatures</li>
              <li>Analysis of token balances in the staking contract</li>
              <li>Event analysis to track staking and locking activity</li>
            </ul>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-blue-400">
                <strong>Implementation Note:</strong> For production applications, we recommend implementing a backend
                service that caches token data from the blockchain or third-party APIs, rather than calculating it on
                each request.
              </p>
            </div>
          </div>
        )}

        <Button variant="link" onClick={() => setIsExpanded(!isExpanded)} className="mt-2 p-0 h-auto text-neon-green">
          {isExpanded ? "Show less" : "Learn more about our data sources"}
        </Button>

        <div className="mt-4">
          <a
            href={`https://scan.mypinata.cloud/ipfs/bafybeih3olry3is4e4lzm7rus5l3h6zrphcal5a7ayfkhzm5oivjro2cp4/#/token/${TOKEN_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-neon-green hover:underline"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View token details on PulseChain Explorer
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

