"use client"

import { useBlockchain } from "@/contexts/blockchain-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function BalanceDisplay() {
  const { balances, isLoading, refreshBalances } = useBlockchain()

  // Format balance for display
  const formatBalance = (balance: string) => {
    const num = Number.parseFloat(balance)
    if (num === 0) return "0"
    if (num < 0.01) return "<0.01"
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  return (
    <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium">Your OPUS Balance</h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={refreshBalances} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Wallet</span>
            <span className="text-sm font-medium">
              {isLoading ? (
                <span className="inline-block w-16 h-4 bg-muted/20 animate-pulse rounded"></span>
              ) : (
                `${formatBalance(balances.wallet)} OPUS`
              )}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Staked</span>
            <span className="text-sm font-medium">
              {isLoading ? (
                <span className="inline-block w-16 h-4 bg-muted/20 animate-pulse rounded"></span>
              ) : (
                `${formatBalance(balances.staked)} OPUS`
              )}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Locked</span>
            <span className="text-sm font-medium">
              {isLoading ? (
                <span className="inline-block w-16 h-4 bg-muted/20 animate-pulse rounded"></span>
              ) : (
                `${formatBalance(balances.locked)} OPUS`
              )}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-neon-green/10 mt-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-sm font-bold text-neon-green">
              {isLoading ? (
                <span className="inline-block w-16 h-4 bg-neon-green/20 animate-pulse rounded"></span>
              ) : (
                `${formatBalance(
                  (
                    Number.parseFloat(balances.wallet) +
                    Number.parseFloat(balances.staked) +
                    Number.parseFloat(balances.locked)
                  ).toString(),
                )} OPUS`
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

