"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ethers } from "ethers"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"

export default function DebugPage() {
  const { account, provider } = useBlockchain()
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [methodName, setMethodName] = useState("getUserLocks")
  const [customAddress, setCustomAddress] = useState("")

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const testMethod = async () => {
    if (!provider && !window.ethereum) {
      addLog("No provider available. Please connect your wallet first.")
      return
    }

    setIsLoading(true)
    addLog(`Testing method: ${methodName}`)

    try {
      // Use connected provider if available, otherwise create a new one
      const ethProvider = provider || new ethers.BrowserProvider(window.ethereum)
      const signer = await ethProvider.getSigner()
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

      // Use custom address if provided, otherwise use connected account
      const targetAddress = customAddress || account

      if (!targetAddress) {
        addLog("No address available. Please connect your wallet or enter a custom address.")
        setIsLoading(false)
        return
      }

      addLog(`Using address: ${targetAddress}`)

      // Call the specified method
      const result = await stakingContract[methodName](targetAddress)

      // Format and log the result
      if (Array.isArray(result)) {
        addLog(`Result is an array with ${result.length} items`)
        result.forEach((item, index) => {
          if (typeof item === "object") {
            // Try to format the object in a readable way
            const formattedItem = Object.entries(item)
              .map(([key, value]) => {
                // Format BigInt values
                if (typeof value === "bigint") {
                  return `${key}: ${ethers.formatUnits(value, 18)} (${value.toString()})`
                }
                return `${key}: ${value}`
              })
              .join(", ")
            addLog(`Item ${index}: ${formattedItem}`)
          } else {
            addLog(`Item ${index}: ${item}`)
          }
        })
      } else if (typeof result === "object") {
        // Try to format the object in a readable way
        const formattedResult = Object.entries(result)
          .map(([key, value]) => {
            // Format BigInt values
            if (typeof value === "bigint") {
              return `${key}: ${ethers.formatUnits(value, 18)} (${value.toString()})`
            }
            return `${key}: ${value}`
          })
          .join(", ")
        addLog(`Result: ${formattedResult}`)
      } else {
        addLog(`Result: ${result}`)
      }
    } catch (error: any) {
      addLog(`Error: ${error.message || "Unknown error"}`)
      console.error("Method test error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // List of methods to try
  const methods = [
    "getUserLocks",
    "getLockPositions",
    "getLocks",
    "getUserLockInfo",
    "mapUserLocks",
    "getUserLockIds",
    "getLockedBalance",
    "getUserLockedAmount",
    "stakingInfo",
  ]

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Staking Contract Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Contract Method</label>
            <div className="flex space-x-2">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={methodName}
                onChange={(e) => setMethodName(e.target.value)}
              >
                {methods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              <Button onClick={testMethod} disabled={isLoading}>
                {isLoading ? "Testing..." : "Test Method"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Custom Address (optional)</label>
            <Input
              placeholder="Enter address to query (leave empty to use connected wallet)"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Logs</label>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                Clear
              </Button>
            </div>
            <div className="h-80 overflow-y-auto border rounded-md p-2 bg-black text-green-400 font-mono text-xs">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">No logs yet. Test a method to see results.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

