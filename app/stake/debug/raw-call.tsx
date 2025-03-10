"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { STAKING_CONTRACT_ADDRESS } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"

// Function signatures for common lock-related functions
const FUNCTION_SIGNATURES = {
  "getUserLocks(address)": "0x9d4323be",
  "getLockPositions(address)": "0x7c94e4c1",
  "getLocks(address)": "0x9d148957",
  "getUserLockInfo(address)": "0x3f5805d8",
  "mapUserLocks(address)": "0x6a2ce441",
  "getUserLockIds(address)": "0x5e1e0f2c",
  "getLockedBalance(address)": "0x45caec2a",
  "getUserLockedAmount(address)": "0x3e615616",
  "stakingInfo(address,address)": "0x8b7afe2e",
}

export default function RawCallPage() {
  const { account } = useBlockchain()
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFunction, setSelectedFunction] = useState("getUserLocks(address)")
  const [customAddress, setCustomAddress] = useState("")
  const [customData, setCustomData] = useState("")

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const makeRawCall = async () => {
    if (!window.ethereum) {
      addLog("No provider available. Please connect your wallet first.")
      return
    }

    setIsLoading(true)
    addLog(`Making raw call with function: ${selectedFunction}`)

    try {
      // Use the address from input or fall back to connected account
      const targetAddress = customAddress || account

      if (!targetAddress) {
        addLog("No address available. Please connect your wallet or enter a custom address.")
        setIsLoading(false)
        return
      }

      addLog(`Using address: ${targetAddress}`)

      // Prepare the data for the call
      let callData

      if (customData) {
        // Use custom data if provided
        callData = customData
        if (!callData.startsWith("0x")) {
          callData = "0x" + callData
        }
      } else {
        // Encode the function call with the selected function signature
        const signature = FUNCTION_SIGNATURES[selectedFunction]

        // Encode the address parameter (pad to 32 bytes)
        const addressParam = targetAddress.toLowerCase().substring(2).padStart(64, "0")

        callData = `0x${signature}${addressParam}`
      }

      addLog(`Call data: ${callData}`)

      // Make the raw eth_call
      const result = await window.ethereum.request({
        method: "eth_call",
        params: [
          {
            to: STAKING_CONTRACT_ADDRESS,
            data: callData,
          },
          "latest",
        ],
      })

      addLog(`Raw result: ${result}`)

      // Try to decode the result if it's not empty
      if (result && result !== "0x") {
        try {
          // For array results, the first 32 bytes (64 chars after 0x) is the offset
          // The next 32 bytes is the length of the array
          if (result.length > 130) {
            const offset = Number.parseInt(result.slice(2, 66), 16)
            const length = Number.parseInt(result.slice(66, 130), 16)
            addLog(`Array data - Offset: ${offset}, Length: ${length}`)

            if (length > 0) {
              addLog(`Found ${length} items in the result`)

              // Try to extract some data from the first item
              // This is a simplified approach and might not work for all data structures
              const dataStart = 130 // 0x + offset (64) + length (64)
              for (let i = 0; i < Math.min(length, 5); i++) {
                const itemStart = dataStart + i * 64 * 5 // Assuming each item has 5 fields of 32 bytes
                if (itemStart + 64 <= result.length) {
                  const id = Number.parseInt(result.slice(itemStart, itemStart + 64), 16)
                  const amount = Number.parseInt(result.slice(itemStart + 64, itemStart + 128), 16)
                  addLog(`Item ${i}: ID=${id}, Amount=${amount}`)
                }
              }
            }
          } else {
            // Single value result
            const value = Number.parseInt(result.slice(2), 16)
            addLog(`Decoded value: ${value}`)
          }
        } catch (error) {
          addLog(`Error decoding result: ${error.message}`)
        }
      } else {
        addLog("Empty result or error returned")
      }
    } catch (error) {
      addLog(`Error: ${error.message || "Unknown error"}`)
      console.error("Raw call error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Raw Contract Call Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Function Signature</label>
            <div className="flex space-x-2">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
              >
                {Object.keys(FUNCTION_SIGNATURES).map((func) => (
                  <option key={func} value={func}>
                    {func}
                  </option>
                ))}
              </select>
              <Button onClick={makeRawCall} disabled={isLoading}>
                {isLoading ? "Calling..." : "Make Call"}
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
            <label className="text-sm font-medium">Custom Call Data (optional)</label>
            <Textarea
              placeholder="Enter custom hex data for the call (overrides function selection)"
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
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
                <div className="text-gray-500 italic">No logs yet. Make a call to see results.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

