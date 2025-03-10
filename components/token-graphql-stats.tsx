"use client"

import { useTokenGraphQL } from "@/hooks/use-token-graphql"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BarChart3, ExternalLink } from "lucide-react"
import { ethers } from "ethers"

// TODO: Replace with actual token contract address or fetch from config
const TOKEN_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"

export function TokenGraphQLStats() {
  const { tokenData, holderCount, topHolders, loading, error } = useTokenGraphQL()

  // Format numbers for display
  const formatNumber = (num: string | number | null) => {
    if (num === null) return "0"
    const numValue = typeof num === "string" ? Number.parseFloat(num) : num
    return numValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  // Format token balance
  const formatBalance = (balance: string, decimals = 18) => {
    try {
      const formatted = ethers.formatUnits(balance, decimals)
      return Number(formatted).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    } catch (error) {
      return "0"
    }
  }

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  if (error) {
    return (
      <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
        <CardHeader>
          <CardTitle>Token Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-400">Error loading token data: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Token Info Card */}
      <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-foreground text-xl">
            <BarChart3 className="mr-2 h-5 w-5 text-neon-green" />
            Token Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-6 bg-muted/20 animate-pulse rounded"></div>
              <div className="h-6 bg-muted/20 animate-pulse rounded"></div>
              <div className="h-6 bg-muted/20 animate-pulse rounded"></div>
            </div>
          ) : tokenData ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="text-sm font-medium">{tokenData.token.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Symbol:</span>
                <span className="text-sm font-medium">{tokenData.token.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Supply:</span>
                <span className="text-sm font-medium">
                  {formatBalance(tokenData.token.totalSupply, tokenData.token.decimals)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Decimals:</span>
                <span className="text-sm font-medium">{tokenData.token.decimals}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No token data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Holder Count Card */}
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
              <p className="text-2xl font-bold text-foreground">{formatNumber(holderCount)}</p>
              <p className="text-sm text-muted-foreground">
                <a
                  href={`https://scan.pulsechain.com/token/${TOKEN_CONTRACT_ADDRESS}/token-holders`}
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

      {/* Top Holders Card */}
      {topHolders.length > 0 && (
        <Card className="bg-background/20 backdrop-blur-md border-neon-green/10 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-foreground text-xl">
              <Users className="mr-2 h-5 w-5 text-neon-green" />
              Top Token Holders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neon-green/10">
                    <th className="text-left py-2 font-medium text-muted-foreground">Address</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {topHolders.slice(0, 5).map((holder, index) => (
                    <tr key={index} className="border-b border-neon-green/5">
                      <td className="py-2">
                        <a
                          href={`https://scan.pulsechain.com/address/${holder.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neon-green hover:underline flex items-center"
                        >
                          {formatAddress(holder.address)}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </td>
                      <td className="text-right py-2">{formatBalance(holder.balance, tokenData?.token.decimals)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

