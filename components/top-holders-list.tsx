"use client"

import { usePulsechainRestHolders } from "@/hooks/use-pulsechain-rest-holders"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ExternalLink } from "lucide-react"
import { ethers } from "ethers"

export function TopHoldersList() {
  const { holders, loading, error } = usePulsechainRestHolders()

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Format balance for display
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

  return (
    <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-foreground text-xl">
          <Users className="mr-2 h-5 w-5 text-neon-green" />
          Top Token Holders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-muted/20 animate-pulse rounded"></div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">Unable to load top holders. Please check back later.</p>
        ) : holders && holders.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neon-green/10">
                    <th className="text-left py-2 font-medium text-muted-foreground">Address</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Balance</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {holders.slice(0, 5).map((holder, index) => (
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
                      <td className="text-right py-2">{formatBalance(holder.value)}</td>
                      <td className="text-right py-2">{holder.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-center">
              <a
                href="https://scan.pulsechain.com/token/0x64aa120986030627C3E1419B09ce604e21B9B0FE/token-holders"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neon-green hover:underline flex items-center justify-center"
              >
                <span>View all holders on PulseChain Explorer</span>
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No holder data available.</p>
        )}
      </CardContent>
    </Card>
  )
}

