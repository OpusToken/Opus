"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ethers } from "ethers"
import { STAKING_CONTRACT_ADDRESS } from "@/lib/constants"
import { useBlockchain } from "@/contexts/blockchain-context"
import { useToast } from "@/components/ui/use-toast"

export default function ExternalFetchPage() {
  const { account, refreshBalances } = useBlockchain()
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [customAddress, setCustomAddress] = useState("")
  const [customAbi, setCustomAbi] = useState("")
  const [customMethod, setCustomMethod] = useState("getUserLocks")
  const { toast } = useToast()

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const fetchWithExternalMethod = async () => {
    if (!window.ethereum) {
      addLog("No provider available. Please connect your wallet first.")
      return
    }

    setIsLoading(true)
    addLog("Starting fetch using external method...")

    try {
      // Use the address from input or fall back to connected account
      const targetAddress = customAddress || account

      if (!targetAddress) {
        addLog("No address available. Please connect your wallet or enter a custom address.")
        setIsLoading(false)
        return
      }

      addLog(`Using address: ${targetAddress}`)

      // Parse the custom ABI if provided
      let abi
      try {
        if (customAbi.trim()) {
          abi = JSON.parse(customAbi)
          addLog("Using custom ABI")
        } else {
          // Default ABI with common lock methods
          abi = [
            "function getUserLocks(address) view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
            "function getLockPositions(address) view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
            "function getLocks(address) view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
            "function getUserLockInfo(address) view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
            "function mapUserLocks(address) view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
            "function getUserLockIds(address) view returns (uint256[])",
            "function getLockInfo(uint256) view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate))",
          ]
          addLog("Using default ABI with common lock methods")
        }
      } catch (error) {
        addLog(`Error parsing ABI: ${error.message}`)
        setIsLoading(false)
        return
      }

      // Create a provider and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum)
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, abi, provider)

      // Call the specified method
      addLog(`Calling method: ${customMethod}`)
      const result = await stakingContract[customMethod](targetAddress)

      // Log the result
      addLog(`Method returned data of type: ${typeof result}`)

      if (Array.isArray(result)) {
        addLog(`Result is an array with ${result.length} items`)

        if (result.length > 0) {
          // Process each lock
          result.forEach((lock, index) => {
            try {
              // Format the lock data for display
              const formattedLock = formatLockData(lock, index)
              addLog(`Lock ${index}: ${formattedLock}`)
            } catch (error) {
              addLog(`Error processing lock ${index}: ${error.message}`)
            }
          })

          // Store the locks in the global userLocks array for the UI to use
          window.userLocks = result

          // Patch the blockchain context if not already patched
          if (!window.fetchBalancesPatch) {
            patchBlockchainContext()
          }

          // Refresh balances to update the UI
          await refreshBalances()

          toast({
            title: "Locks Found",
            description: `Successfully found ${result.length} locks using external method`,
          })
        } else {
          addLog("No locks found (empty array)")

          toast({
            title: "No Locks Found",
            description: "The method returned an empty array",
            variant: "destructive",
          })
        }
      } else if (typeof result === "object") {
        addLog(`Result is an object with keys: ${Object.keys(result).join(", ")}`)

        // Try to convert to array if it's not already
        const locksArray = Array.isArray(result) ? result : Object.values(result)

        if (locksArray.length > 0) {
          // Process each lock
          locksArray.forEach((lock, index) => {
            try {
              // Format the lock data for display
              const formattedLock = formatLockData(lock, index)
              addLog(`Lock ${index}: ${formattedLock}`)
            } catch (error) {
              addLog(`Error processing lock ${index}: ${error.message}`)
            }
          })

          // Store the locks in the global userLocks array for the UI to use
          window.userLocks = locksArray

          // Patch the blockchain context if not already patched
          if (!window.fetchBalancesPatch) {
            patchBlockchainContext()
          }

          // Refresh balances to update the UI
          await refreshBalances()

          toast({
            title: "Locks Found",
            description: `Successfully found ${locksArray.length} locks using external method`,
          })
        } else {
          addLog("No locks found (empty object)")

          toast({
            title: "No Locks Found",
            description: "The method returned an empty object",
            variant: "destructive",
          })
        }
      } else {
        addLog(`Unexpected result type: ${typeof result}`)

        toast({
          title: "Unexpected Result",
          description: `The method returned a ${typeof result} instead of an array or object`,
          variant: "destructive",
        })
      }
    } catch (error) {
      addLog(`Error in external fetch: ${error.message || "Unknown error"}`)
      console.error("External fetch error:", error)

      toast({
        title: "Fetch Failed",
        description: "Failed to fetch locks. See logs for details.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to format lock data for display
  const formatLockData = (lock: any, index: number) => {
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

      return `Amount=${amount} OPUS, Start=${startTime}, End=${endTime}, Period=${lockPeriod}`
    } else {
      return `Unexpected format - ${typeof lock}`
    }
  }

  // Patch the blockchain context to use our fetched locks
  const patchBlockchainContext = () => {
    const originalFetchBalances = window.fetchBalances

    window.fetchBalancesPatch = (opusToken, stakingContract, userAddress) => {
      console.log("Using patched fetchBalances with external method results")

      // Call original function if it exists
      const result = originalFetchBalances ? originalFetchBalances(opusToken, stakingContract, userAddress) : null

      // Inject our fetched locks
      if (window.userLocks && window.userLocks.length > 0) {
        console.log("Injecting externally fetched locks:", window.userLocks)
        window.setUserLocks(window.userLocks)
      }

      return result
    }

    addLog("Blockchain context patched to use externally fetched locks")
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>External Method Lock Fetch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use this tool to fetch locks using methods from other implementations. You can specify a custom ABI and
            method name.
          </p>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Custom Address (optional)</label>
            <Input
              placeholder="Enter address to query (leave empty to use connected wallet)"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Method Name</label>
            <Input
              placeholder="Enter method name (e.g., getUserLocks)"
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Custom ABI (optional)</label>
            <Textarea
              placeholder="Enter custom ABI JSON (leave empty to use default)"
              value={customAbi}
              onChange={(e) => setCustomAbi(e.target.value)}
              className="min-h-[100px] font-mono text-xs"
            />
          </div>

          <div className="flex space-x-2">
            <Button onClick={fetchWithExternalMethod} disabled={isLoading} className="flex-1">
              {isLoading ? "Fetching..." : "Fetch Using External Method"}
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
              <strong>Tip:</strong> After successfully fetching locks, go back to the staking page to see if they appear
              in the UI. If they do, you can use this method in the main application code.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

