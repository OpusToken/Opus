"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"

export default function LockQueryPage() {
  const [address, setAddress] = useState("")
  const [lockId, setLockId] = useState("")
  const [allLocks, setAllLocks] = useState<any[]>([])
  const [lockInfo, setLockInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get all locks for a user
  const getAllLocks = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)
    setAllLocks([])

    try {
      // Connect to PulseChain
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Try to get lock IDs first
      try {
        console.log("Trying to get lock IDs...")
        const lockIds = await contract.getUserLockIds(address)
        console.log("Lock IDs:", lockIds)

        if (lockIds && lockIds.length > 0) {
          const lockPromises = lockIds.map(async (id: bigint) => {
            try {
              const info = await contract.getLockInfo(id)
              return {
                id: id.toString(),
                ...info,
                // Add formatted values for better readability
                formattedAmount: ethers.formatUnits(info.amount || info[1] || 0, 18),
                startDate: new Date(Number(info.startTime || info[2] || 0) * 1000).toLocaleString(),
                endDate: new Date(Number(info.endTime || info[3] || 0) * 1000).toLocaleString(),
              }
            } catch (err) {
              console.warn(`Failed to get info for lock ID ${id}:`, err)
              return null
            }
          })

          const lockDetails = await Promise.all(lockPromises)
          const validLocks = lockDetails.filter((lock) => lock !== null)
          setAllLocks(validLocks)

          if (validLocks.length === 0) {
            setError("No valid locks found for this address")
          }
        } else {
          setError("No lock IDs found for this address")
        }
      } catch (err) {
        console.warn("Failed to get lock IDs, trying getUserLocks...", err)

        // Try getUserLocks as fallback
        try {
          const locks = await contract.getUserLocks(address)
          console.log("User locks:", locks)

          if (locks && locks.length > 0) {
            const formattedLocks = locks.map((lock: any, index: number) => {
              // Handle different possible formats
              const id = lock.id || lock.nonce || lock[0] || index.toString()
              const amount = lock.amount || lock[1] || 0
              const startTime = lock.startTime || lock.start || lock[2] || 0
              const endTime = lock.endTime || lock.end || lock[3] || 0

              return {
                id: id.toString(),
                amount,
                startTime,
                endTime,
                // Add formatted values
                formattedAmount: ethers.formatUnits(amount, 18),
                startDate: new Date(Number(startTime) * 1000).toLocaleString(),
                endDate: new Date(Number(endTime) * 1000).toLocaleString(),
              }
            })

            setAllLocks(formattedLocks)
          } else {
            setError("No locks found for this address")
          }
        } catch (err2) {
          console.error("Failed to get user locks:", err2)
          setError("Failed to retrieve locks. The contract might use a different method.")
        }
      }
    } catch (err: any) {
      console.error("Error getting locks:", err)
      setError(err.message || "An error occurred while querying locks")
    } finally {
      setLoading(false)
    }
  }

  // Get info for a specific lock ID
  const getLockInfo = async () => {
    if (!lockId) {
      setError("Please enter a lock ID")
      return
    }

    setLoading(true)
    setError(null)
    setLockInfo(null)

    try {
      // Connect to PulseChain
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Get lock info
      const info = await contract.getLockInfo(lockId)
      console.log("Lock info:", info)

      // Format the info
      const formattedInfo = {
        id: lockId,
        ...info,
        // Add formatted values
        formattedAmount: ethers.formatUnits(info.amount || info[1] || 0, 18),
        startDate: new Date(Number(info.startTime || info[2] || 0) * 1000).toLocaleString(),
        endDate: new Date(Number(info.endTime || info[3] || 0) * 1000).toLocaleString(),
      }

      setLockInfo(formattedInfo)
    } catch (err: any) {
      console.error("Error getting lock info:", err)
      setError(err.message || "An error occurred while querying lock info")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Lock Query Tool</h1>
      <p className="text-muted-foreground mb-6">
        This tool helps you query lock data from the staking contract using the methods discovered from transaction
        analysis.
      </p>

      <Tabs defaultValue="allLocks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="allLocks">Get All Locks</TabsTrigger>
          <TabsTrigger value="lockInfo">Get Lock Info</TabsTrigger>
        </TabsList>

        <TabsContent value="allLocks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Get All Locks for Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter wallet address (0x...)"
                />
                <Button onClick={getAllLocks} disabled={loading || !address}>
                  {loading ? "Querying..." : "Get Locks"}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {allLocks.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Found {allLocks.length} locks:</p>

                  {allLocks.map((lock, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Lock ID</p>
                            <p className="text-sm text-muted-foreground">{lock.id}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Amount</p>
                            <p className="text-sm text-muted-foreground">{lock.formattedAmount} OPUS</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Start Date</p>
                            <p className="text-sm text-muted-foreground">{lock.startDate}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">End Date</p>
                            <p className="text-sm text-muted-foreground">{lock.endDate}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Duration (days)</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.floor((Number(lock.endTime) - Number(lock.startTime)) / (24 * 60 * 60))}
                            </p>
                          </div>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLockId(lock.id)
                                document.querySelector('[data-state="inactive"][value="lockInfo"]')?.click()
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lockInfo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Get Lock Info by ID</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input value={lockId} onChange={(e) => setLockId(e.target.value)} placeholder="Enter lock ID" />
                <Button onClick={getLockInfo} disabled={loading || !lockId}>
                  {loading ? "Querying..." : "Get Info"}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {lockInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle>Lock Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Lock ID</p>
                        <p className="text-sm text-muted-foreground">{lockInfo.id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Amount</p>
                        <p className="text-sm text-muted-foreground">{lockInfo.formattedAmount} OPUS</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Start Date</p>
                        <p className="text-sm text-muted-foreground">{lockInfo.startDate}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">End Date</p>
                        <p className="text-sm text-muted-foreground">{lockInfo.endDate}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Duration (days)</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.floor((Number(lockInfo.endTime) - Number(lockInfo.startTime)) / (24 * 60 * 60))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Raw Data</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const el = document.getElementById("rawData")
                            if (el) el.style.display = el.style.display === "none" ? "block" : "none"
                          }}
                        >
                          Toggle Raw Data
                        </Button>
                      </div>
                    </div>

                    <div id="rawData" className="mt-4 overflow-auto max-h-[200px]" style={{ display: "none" }}>
                      <pre className="text-xs p-4 bg-muted rounded-md">
                        {JSON.stringify(
                          lockInfo,
                          (key, value) => (typeof value === "bigint" ? value.toString() : value),
                          2,
                        )}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

