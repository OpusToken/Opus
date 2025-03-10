"use client"

import { useBlockchain } from "@/contexts/blockchain-context"
import { Wallet } from "lucide-react"
import { useEffect } from "react"

export function TokenBalance() {
  const { isConnected, balances, isLoading, refreshBalances } = useBlockchain()

  useEffect(() => {
    // Only refresh once when the component mounts and the user is connected
    const initialRefresh = async () => {
      if (isConnected && !isLoading) {
        await refreshBalances()
      }
    }

    initialRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]) // Only depend on isConnected to prevent refreshing on every render

  // Format balance for display
  const formatBalance = (balance: string) => {
    if (!balance) return "0"
    const num = Number.parseFloat(balance)
    if (isNaN(num)) return "0"
    if (num === 0) return "0"
    if (num < 0.01) return "<0.01"
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  if (!isConnected) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-neon-green/10 rounded-md">
      <Wallet className="h-4 w-4 text-neon-green" />
      <span className="text-sm font-medium text-neon-green">
        {isLoading ? (
          <span className="inline-block w-16 h-4 bg-neon-green/20 animate-pulse rounded"></span>
        ) : (
          `${formatBalance(balances.wallet)} OPUS`
        )}
      </span>
    </div>
  )
}

