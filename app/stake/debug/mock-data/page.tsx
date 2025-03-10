"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBlockchain } from "@/contexts/blockchain-context"
import { ethers } from "ethers"
import { useToast } from "@/components/ui/use-toast"

export default function MockDataPage() {
  const { account, refreshBalances } = useBlockchain()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [mockLocks, setMockLocks] = useState<any[]>([])

  // Create mock lock data
  const createMockLock = async () => {
    setIsLoading(true)

    try {
      if (!window.userLocks) {
        window.userLocks = []
      }

      // Create a mock lock with random values
      const lockId = window.userLocks.length + 1
      const amount = Math.floor(Math.random() * 1000) + 100 // Random amount between 100-1100
      const startTime = Math.floor(Date.now() / 1000 - 86400 * Math.floor(Math.random() * 30)) // Started 1-30 days ago
      const lockPeriod = [90, 180, 365, 730, 1095][Math.floor(Math.random() * 5)] // Random lock period from tiers
      const endTime = startTime + lockPeriod * 86400 // End time based on lock period

      const mockLock = {
        id: lockId.toString(), // Convert to string to match expected format
        amount: ethers.parseUnits(amount.toString(), 18),
        startTime: startTime,
        endTime: endTime,
        lockPeriod: lockPeriod,
      }

      // Add to global window object so we can access it from the blockchain context
      window.userLocks.push(mockLock)
      setMockLocks([...window.userLocks])

      // Log the mock data
      console.log("Created mock lock data:", window.userLocks)

      toast({
        title: "Mock Lock Created",
        description: `Created lock #${lockId} for ${amount} OPUS with ${lockPeriod} days period`,
      })

      // Force a refresh to update the UI
      await refreshBalances()
    } catch (error) {
      console.error("Error creating mock lock:", error)
      toast({
        title: "Error",
        description: "Failed to create mock lock data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Create multiple mock locks at once
  const createMultipleMockLocks = async () => {
    setIsLoading(true)

    try {
      // Create 3 mock locks
      for (let i = 0; i < 3; i++) {
        await createMockLock()
      }

      toast({
        title: "Multiple Locks Created",
        description: "Created 3 mock locks with random values",
      })
    } catch (error) {
      console.error("Error creating multiple mock locks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Clear all mock locks
  const clearMockLocks = () => {
    window.userLocks = []
    setMockLocks([])
    toast({
      title: "Mock Locks Cleared",
      description: "All mock lock data has been cleared",
    })
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

      // Patch the unlock function to handle mock locks
      window.unlockPatch = async (lockId) => {
        console.log("Mock unlock called for lock ID:", lockId)

        if (!window.userLocks) {
          throw new Error("No mock locks found")
        }

        // Find the lock with the given ID
        const lockIndex = window.userLocks.findIndex((lock) => lock.id.toString() === lockId.toString())

        if (lockIndex === -1) {
          throw new Error(`Lock with ID ${lockId} not found`)
        }

        // Remove the lock from the array
        const removedLock = window.userLocks.splice(lockIndex, 1)[0]
        setMockLocks([...window.userLocks])

        console.log(`Mock lock ${lockId} unlocked successfully:`, removedLock)

        // Return success
        return true
      }

      toast({
        title: "Context Patched",
        description: "Blockchain context patched to use mock data",
      })

      console.log("Blockchain context patched to use mock data")
    } catch (error) {
      console.error("Error patching blockchain context:", error)
      toast({
        title: "Error",
        description: "Failed to patch blockchain context",
        variant: "destructive",
      })
    }
  }

  // Format timestamp to date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Format amount for display
  const formatAmount = (amountBigInt: bigint) => {
    try {
      const formatted = ethers.formatUnits(amountBigInt, 18)
      return Number.parseFloat(formatted).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    } catch (error) {
      return "Error"
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

          <div className="flex flex-wrap gap-2">
            <Button onClick={createMockLock} disabled={isLoading}>
              Create Single Mock Lock
            </Button>

            <Button onClick={createMultipleMockLocks} disabled={isLoading} variant="secondary">
              Create Multiple Locks
            </Button>

            <Button onClick={patchBlockchainContext} disabled={isLoading} variant="outline">
              Patch Context
            </Button>

            <Button onClick={clearMockLocks} disabled={isLoading} variant="destructive">
              Clear All Locks
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-md">
            <h3 className="font-medium mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Patch Context" to override the blockchain context</li>
              <li>Click "Create Single Mock Lock" to generate a mock lock with random values</li>
              <li>Go back to the staking page to see the mock data displayed</li>
              <li>Use "Create Multiple Locks" to quickly generate several locks at once</li>
              <li>Use "Clear All Locks" to remove all mock data</li>
              <li>
                <strong>You can now end lock periods</strong> - the unlock function has been patched to work with mock
                data
              </li>
            </ol>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Current Mock Locks:</h3>
            {mockLocks.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        End Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Period (Days)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y divide-gray-700">
                    {mockLocks.map((lock, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{lock.id.toString()}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                          {formatAmount(lock.amount)} OPUS
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(lock.startTime)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(lock.endTime)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{lock.lockPeriod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-4 bg-gray-900 rounded-md text-gray-400">No mock locks created yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

