"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ethers } from "ethers"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"
import { useToast } from "@/components/ui/use-toast"

export default function DirectFetchPage() {
  const { account } = useBlockchain()
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [customAddress, setCustomAddress] = useState("")
  const { toast } = useToast()

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const directFetchLocks = async () => {
    if (!window.ethereum) {
      addLog("No provider available. Please connect your wallet first.")
      return
    }

    setIsLoading(true)
    addLog("Starting direct fetch of locks...")

    try {
      // Use the address from input or fall back to connected account
      const targetAddress = customAddress || account

      if (!targetAddress) {
        addLog("No address available. Please connect your wallet or enter a custom address.")
        setIsLoading(false)
        return
      }

      addLog(`Using address: ${targetAddress}`)

      // Create a provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum)
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Try multiple methods to get locks
      const methods = ["getUserLocks", "getLockPositions", "getLocks", "getUserLockInfo", "mapUserLocks"]

      let locks = null
      let successMethod = null

      for (const method of methods) {
        try {
          addLog(`Trying ${method}...`)
          const result = await stakingContract[method](targetAddress)
          addLog(`${method} returned data of type: ${typeof result}`)

          if (result) {
            if (Array.isArray(result)) {
              addLog(`${method} returned an array with ${result.length} items`)
              if (result.length > 0) {
                locks = result
                successMethod = method
                break
              }
            } else if (typeof result === "object") {
              addLog(`${method} returned an object with keys: ${Object.keys(result).join(", ")}`)
              locks = result
              successMethod = method
              break
            }
          }
        } catch (error) {
          addLog(`${method} failed: ${error.message || "Unknown error"}`)
        }
      }

      if (!locks) {
        // Try getting lock IDs first
        try {
          addLog("Trying to get lock IDs first...")
          const lockIds = await stakingContract.getUserLockIds(targetAddress)

          if (lockIds && Array.isArray(lockIds) && lockIds.length > 0) {
            addLog(`Found ${lockIds.length} lock IDs: ${lockIds.join(", ")}`)

            const lockPromises = lockIds.map((id) =>
              stakingContract
                .getLockInfo(id)
                .then((info) => {
                  addLog(`Got info for lock ID ${id}`)
                  return info
                })
                .catch((err) => {
                  addLog(`Failed to get info for lock ID ${id}: ${err.message}`)
                  return null
                }),
            )

            const lockDetails = await Promise.all(lockPromises)
            const validLocks = lockDetails.filter((lock) => lock !== null)

            if (validLocks.length > 0) {
              locks = validLocks
              successMethod = "getLockInfo via IDs"
              addLog(`Successfully retrieved ${validLocks.length} locks via IDs`)
            }
          } else {
            addLog("No lock IDs found or returned data is not an array")
          }
        } catch (error) {
          addLog(`Error getting lock IDs: ${error.message || "Unknown error"}`)
        }
      }

      // Process and display the locks if found
      if (locks) {
        addLog(`Successfully fetched locks using ${successMethod}!`)

        // Convert to array if it's not already
        const locksArray = Array.isArray(locks) ? locks : Object.values(locks)

        // Process each lock
        locksArray.forEach((lock, index) => {
          try {
            // Extract basic info
            const id = lock.id || lock[0] || index
            let amount, startTime, endTime, lockPeriod

            // Handle different data structures
            if (typeof lock === "object") {
              // Try to extract amount
              if (lock.amount) {
                amount = ethers.formatUnits(lock.amount, 18)
              } else if (lock[1]) {
                amount = ethers.formatUnits(lock[1], 18)
              } else {
                amount = "Unknown"
              }

              // Try to extract timestamps
              startTime = lock.startTime || lock.start || lock[2] || "Unknown"
              endTime = lock.endTime || lock.end || lock[3] || "Unknown"

              // Format timestamps if they're numbers
              if (typeof startTime === "number" || typeof startTime === "bigint") {
                startTime = new Date(Number(startTime) * 1000).toLocaleString()
              }
              if (typeof endTime === "number" || typeof endTime === "bigint") {
                endTime = new Date(Number(endTime) * 1000).toLocaleString()
              }

              // Try to get lock period
              if (lock.lockPeriod) {
                lockPeriod = lock.lockPeriod.toString()
              } else if (lock.period) {
                lockPeriod = lock.period.toString()
              } else if (lock[4]) {
                lockPeriod = lock[4].toString()
              } else if (typeof startTime === "string" && typeof endTime === "string") {
                lockPeriod = "Cannot calculate from formatted dates"
              } else {
                lockPeriod = "Unknown"
              }

              addLog(`Lock ${id}: Amount=${amount} OPUS, Start=${startTime}, End=${endTime}, Period=${lockPeriod}`)
            } else {
              addLog(`Lock ${index}: Unexpected format - ${typeof lock}`)
            }
          } catch (error) {
            addLog(`Error processing lock ${index}: ${error.message}`)
          }
        })

        // Show success toast
        toast({
          title: "Locks Found",
          description: `Successfully found ${locksArray.length} locks`,
        })
      } else {
        addLog("No locks found after trying all methods")

        toast({
          title: "No Locks Found",
          description: "Could not find any locks for this address",
          variant: "destructive",
        })
      }
    } catch (error) {
      addLog(`Error in direct fetch: ${error.message || "Unknown error"}`)
      console.error("Direct fetch error:", error)

      toast({
        title: "Fetch Failed",
        description: "Failed to fetch locks. See logs for details.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Direct Lock Fetch Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This tool directly fetches lock data from the blockchain using multiple methods, bypassing the application's
            state management. Use it to verify if locks exist on the blockchain.
          </p>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Custom Address (optional)</label>
            <Input
              placeholder="Enter address to query (leave empty to use connected wallet)"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
            />
          </div>

          <div className="flex space-x-2">
            <Button onClick={directFetchLocks} disabled={isLoading} className="flex-1">
              {isLoading ? "Fetching..." : "Fetch Locks Directly"}
            </Button>
            <Button variant="outline" onClick={clearLogs} disabled={isLoading}>
              Clear Logs
            </Button>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Logs</label>
            <div className="h-80 overflow-y-auto border rounded-md p-2 bg-black text-green-400 font-mono text-xs">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">No logs yet. Fetch locks to see results.</div>
              )}
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="text-sm text-blue-400">
              <strong>Tip:</strong> If this tool finds locks but they're not showing in the UI, there might be an issue
              with how the application is processing or displaying the lock data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

