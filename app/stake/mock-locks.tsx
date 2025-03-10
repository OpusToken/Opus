"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ethers } from "ethers"
import { useBlockchain } from "@/contexts/blockchain-context"
import { useToast } from "@/components/ui/use-toast"

// Define a type for our mock locks
type MockLock = {
  id: string
  amount: bigint
  startTime: number
  endTime: number
  lockPeriod: number
}

export default function MockLocksPage() {
  const { refreshBalances } = useBlockchain()
  const [amount, setAmount] = useState("100")
  const [days, setDays] = useState("90")
  const [isCreating, setIsCreating] = useState(false)
  const [mockLocks, setMockLocks] = useState<MockLock[]>([])
  const { toast } = useToast()

  // Initialize from window object on client-side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Initialize the userLocks array if it doesn't exist
      if (!window.userLocks) {
        window.userLocks = []
      }

      setMockLocks(window.userLocks || [])

      // Set up the patch if not already done
      if (!window.fetchBalancesPatch && window.fetchBalances) {
        const originalFetchBalances = window.fetchBalances

        window.fetchBalancesPatch = (opusToken, stakingContract, userAddress) => {
          console.log("Using patched fetchBalances")

          // Call original function if it exists
          const result = originalFetchBalances ? originalFetchBalances(opusToken, stakingContract, userAddress) : null

          // Inject mock locks
          if (window.userLocks && window.userLocks.length > 0) {
            console.log("Injecting mock locks:", window.userLocks)
            if (window.setUserLocks) {
              window.setUserLocks(window.userLocks)
            }
          }

          return result
        }

        console.log("Blockchain context patched")
      }
    }
  }, [])

  // Create a mock lock
  const createMockLock = async () => {
    if (typeof window === "undefined") return

    setIsCreating(true)

    try {
      // Initialize the userLocks array if it doesn't exist
      if (!window.userLocks) {
        window.userLocks = []
      }

      // Generate a unique ID
      const lockId = window.userLocks.length + 1

      // Get current timestamp
      const now = Math.floor(Date.now() / 1000)

      // Create the mock lock
      const mockLock = {
        id: lockId.toString(),
        amount: ethers.parseUnits(amount, 18),
        startTime: now,
        endTime: now + Number(days) * 86400,
        lockPeriod: Number(days),
      }

      // Add to the global array
      window.userLocks.push(mockLock)
      setMockLocks([...window.userLocks])

      console.log("Created mock lock:", mockLock)
      console.log("All mock locks:", window.userLocks)

      // Refresh balances to update the UI
      await refreshBalances()

      toast({
        title: "Mock Lock Created",
        description: `Created a mock lock for ${amount} OPUS with ${days} days period`,
      })
    } catch (error) {
      console.error("Error creating mock lock:", error)

      toast({
        title: "Error",
        description: "Failed to create mock lock",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Clear all mock locks
  const clearMockLocks = () => {
    if (typeof window === "undefined") return

    window.userLocks = []
    setMockLocks([])

    toast({
      title: "Mock Locks Cleared",
      description: "All mock locks have been removed",
    })

    // Refresh to update UI
    refreshBalances()
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Quick Mock Lock Creator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create mock locks to test the UI without interacting with the blockchain. These locks will be displayed in
            the UI but don't exist on the blockchain.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (OPUS)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lock Period (days)</label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} min="90" />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={createMockLock} disabled={isCreating} className="flex-1">
              {isCreating ? "Creating..." : "Create Mock Lock"}
            </Button>
            <Button variant="destructive" onClick={clearMockLocks}>
              Clear All
            </Button>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <p className="text-sm text-amber-400">
              <strong>Note:</strong> After creating mock locks, go back to the staking page to see them. You may need to
              refresh the page if this is your first time creating mock locks.
            </p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Current Mock Locks:</h3>
            <div className="p-2 bg-black/20 rounded text-xs overflow-auto max-h-40">
              <pre>
                {JSON.stringify(mockLocks, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

