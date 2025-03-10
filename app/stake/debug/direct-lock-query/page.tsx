"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STAKING_CONTRACT_ADDRESS } from "@/lib/contracts"

export default function DirectLockQueryPage() {
  const [address, setAddress] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customAbi, setCustomAbi] = useState("")
  const [customMethod, setCustomMethod] = useState("")

  // Direct RPC call to get locks
  const queryLocksDirect = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Connect to PulseChain
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      // Create a minimal ABI for the function we want to call
      const minimalAbi = customAbi || [
        "function getUserLocks(address) view returns (tuple(uint256,uint256,uint256,uint256,uint256)[])",
        "function getLockPositions(address) view returns (tuple(uint256,uint256,uint256,uint256,uint256)[])",
        "function getLocks(address) view returns (tuple(uint256,uint256,uint256,uint256,uint256)[])",
        "function mapUserLocks(address) view returns (tuple(uint256,uint256,uint256,uint256,uint256)[])",
        "function getUserLockIds(address) view returns (uint256[])",
        "function getUserLockInfo(address) view returns (tuple(uint256,uint256,uint256,uint256,uint256)[])",
      ]

      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, minimalAbi, provider)

      // Try different methods to get locks
      const methods = customMethod
        ? [customMethod]
        : ["getUserLocks", "getLockPositions", "getLocks", "mapUserLocks", "getUserLockInfo"]

      let successfulMethod = null
      let lockData = null

      for (const method of methods) {
        try {
          console.log(`Trying ${method}...`)
          const data = await contract[method](address)
          console.log(`${method} result:`, data)

          if (
            data &&
            (Array.isArray(data) || typeof data === "object") &&
            (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)
          ) {
            successfulMethod = method
            lockData = data
            break
          }
        } catch (err) {
          console.warn(`${method} failed:`, err)
        }
      }

      // If no direct method worked, try getting lock IDs first
      if (!lockData) {
        try {
          console.log("Trying getUserLockIds...")
          const lockIds = await contract.getUserLockIds(address)
          console.log("Lock IDs:", lockIds)

          if (lockIds && lockIds.length > 0) {
            successfulMethod = "getUserLockIds + getLockInfo"
            lockData = []

            for (const id of lockIds) {
              try {
                const lockInfo = await contract.getLockInfo(id)
                if (lockInfo) {
                  lockData.push({ ...lockInfo, id })
                }
              } catch (err) {
                console.warn(`Failed to get info for lock ID ${id}:`, err)
              }
            }
          }
        } catch (err) {
          console.warn("getUserLockIds failed:", err)
        }
      }

      // Try direct RPC call as last resort
      if (!lockData) {
        try {
          console.log("Trying direct RPC call...")

          // Function signature for getUserLocks(address)
          const functionSignature = ethers.id("getUserLocks(address)").slice(0, 10)

          // Encode the address parameter
          const encodedAddress = ethers.zeroPadValue(address, 32)

          // Combine function signature and encoded parameters
          const callData = ethers.concat([functionSignature, encodedAddress])

          // Make the call
          const result = await provider.call({
            to: STAKING_CONTRACT_ADDRESS,
            data: callData,
          })

          console.log("Direct RPC call result:", result)

          if (result && result !== "0x") {
            successfulMethod = "direct RPC call"
            lockData = {
              raw: result,
              note: "Raw data returned. Decoding required.",
            }
          }
        } catch (err) {
          console.warn("Direct RPC call failed:", err)
        }
      }

      if (lockData) {
        setResult({
          method: successfulMethod,
          data: lockData,
        })
      } else {
        setError("No lock data found using any method")
      }
    } catch (err: any) {
      console.error("Error querying locks:", err)
      setError(err.message || "An error occurred while querying locks")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Direct Lock Query Tool</h1>
      <p className="text-muted-foreground mb-6">
        This tool attempts to directly query lock data from the staking contract using multiple methods.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Query Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Wallet Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Custom ABI (Optional)</label>
              <Input
                value={customAbi}
                onChange={(e) => setCustomAbi(e.target.value)}
                placeholder="function customMethod(address) view returns (...)"
              />
              <p className="text-xs text-muted-foreground">
                Enter a custom ABI string if you know the exact function signature
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Method Name (Optional)</label>
              <Input
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                placeholder="e.g., getUserLockPositions"
              />
              <p className="text-xs text-muted-foreground">
                Enter a specific method name to try instead of the default methods
              </p>
            </div>

            <Button onClick={queryLocksDirect} disabled={loading || !address} className="w-full">
              {loading ? "Querying..." : "Query Locks"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-sm text-green-500">
                    Successfully retrieved lock data using: <strong>{result.method}</strong>
                  </p>
                </div>

                <div className="overflow-auto max-h-[400px]">
                  <pre className="text-xs p-4 bg-muted rounded-md">
                    {JSON.stringify(
                      result.data,
                      (key, value) => (typeof value === "bigint" ? value.toString() : value),
                      2,
                    )}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Enter a wallet address and click "Query Locks" to see the result
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Contract Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground break-all">
              Staking Contract Address: {STAKING_CONTRACT_ADDRESS}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

