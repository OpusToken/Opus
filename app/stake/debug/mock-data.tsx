"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBlockchain } from "@/contexts/blockchain-context"
import { ethers } from "ethers"

export default function MockDataPage() {
  const { account, refreshBalances } = useBlockchain()
  const [isLoading, setIsLoading] = useState(false)

  // Create mock lock data
  const createMockLocks = async () => {
    if (!window.userLocks) {
      window.userLocks = []
    }

    // Create a mock lock
    const mockLock = {
      id: ethers.toBigInt(1),
      amount: ethers.parseUnits("100", 18), // 100 tokens
      startTime: Math.floor(Date.now() / 1000 - 86400), // Started 1 day ago
      endTime: Math.floor(Date.now() / 1000 + 86400 * 90), // Ends in 90 days
      lockPeriod: 90, // 90 days
    }

    // Add to global window object so we can access it from the blockchain context
    window.userLocks.push(mockLock)

    // Log the mock data
    console.log("Created mock lock data:", window.userLocks)

    // Force a refresh to update the UI
    await refreshBalances()
  }

  // Patch the blockchain context to use mock data
  const patchBlockchainContext = () => {
    try {
      // Override the fetchUserLocks function in the blockchain context
      const originalFetchBalances = window.fetchBalances

      window.fetchBalancesPatch = (opusToken, stakingContract, userAddress) => {
        console.log("Patched fetchBalances called")

        // Call the original function first
        const result = originalFetchBalances ? originalFetchBalances(opusToken, stakingContract, userAddress) : null

        // Then inject our mock data
        if (window.userLocks && window.userLocks.length > 0) {
          console.log("Injecting mock lock data:", window.userLocks)
          window.setUserLocks(window.userLocks)
        }

        return result
      }

      console.log("Blockchain context patched to use mock data")
    } catch (error) {
      console.error("Error patching blockchain context:", error)
    }
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Mock Lock Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page allows you to create mock lock data for testing purposes. The mock data will be displayed in the
            UI as if it came from the blockchain.
          </p>

          <div className="flex space-x-4">
            <Button onClick={createMockLocks} disabled={isLoading}>
              Create Mock Lock
            </Button>

            <Button onClick={patchBlockchainContext} disabled={isLoading} variant="outline">
              Patch Context
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-md">
            <h3 className="font-medium mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Patch Context" to override the blockchain context</li>
              <li>Click "Create Mock Lock" to generate mock lock data</li>
              <li>Go back to the staking page to see the mock data displayed</li>
            </ol>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Current Mock Data:</h3>
            <pre className="p-2 bg-black text-green-400 rounded-md text-xs overflow-auto max-h-40">
              {JSON.stringify(window.userLocks || [], null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

