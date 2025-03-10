"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OPUS_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, OPUS_TOKEN_ABI } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function UnlockAnalyzerPage() {
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [lockInfo, setLockInfo] = useState<any>(null)
  const [lockId, setLockId] = useState<string>("2") // Default to lock ID 2 from the trace
  const [unlockEvents, setUnlockEvents] = useState<any[]>([])
  const [lockEvents, setLockEvents] = useState<any[]>([])
  const [tokenEvents, setTokenEvents] = useState<any[]>([])
  const { account } = useBlockchain()

  // Auto-fill connected wallet address
  useEffect(() => {
    if (account) {
      setAddress(account)
    }
  }, [account])

  // Get user info and lock info
  const getLockInfo = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    if (!lockId) {
      setError("Please enter a lock ID")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)
      const tokenContract = new ethers.Contract(OPUS_TOKEN_ADDRESS, OPUS_TOKEN_ABI, provider)

      // Get user info from staking contract
      const info = await stakingContract.mapUserInfo(address)
      setUserInfo({
        amount: info.amount.toString(),
        rewardDebt: info.rewardDebt.toString(),
        startTime: Number(info.startTime),
        claimed: info.claimed.toString(),
        lockClaimed: info.lockClaimed.toString(),
        locked: info.locked.toString(),
        pendingToClaimed: info.pendingToClaimed.toString(),
      })

      // Get specific lock info
      try {
        const lock = await stakingContract.mapUserInfoLock(address, lockId)
        setLockInfo({
          id: lockId,
          amount: lock.amount.toString(),
          startTime: Number(lock.startTime),
          endTime: Number(lock.endTime),
          rewardDebt: lock.rewardDebt.toString(),
        })
      } catch (err) {
        console.warn("Error getting lock info:", err)
        setLockInfo(null)
      }

      // Get unlock events
      const unlockFilter = stakingContract.filters.UnLockToken?.(address) || stakingContract.filters.Unlock?.(address)

      if (unlockFilter) {
        const unlockLogs = await provider.getLogs({
          address: STAKING_CONTRACT_ADDRESS,
          topics: unlockFilter.topics,
          fromBlock: 18000000, // Start from a reasonable block
          toBlock: "latest",
        })

        const parsedUnlockEvents = unlockLogs
          .map((log) => {
            try {
              const parsedLog = stakingContract.interface.parseLog(log)
              return {
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber,
                amount: parsedLog.args[1]?.toString() || "Unknown",
                timestamp: 0, // Will be filled in later
              }
            } catch (err) {
              console.warn("Error parsing unlock log:", err)
              return null
            }
          })
          .filter(Boolean)

        // Get block timestamps
        for (const event of parsedUnlockEvents) {
          const block = await provider.getBlock(event.blockNumber)
          if (block) {
            event.timestamp = block.timestamp
          }
        }

        setUnlockEvents(parsedUnlockEvents)
      }

      // Get lock events
      const lockFilter = stakingContract.filters.LockToken?.(address) || stakingContract.filters.Lock?.(address)

      if (lockFilter) {
        const lockLogs = await provider.getLogs({
          address: STAKING_CONTRACT_ADDRESS,
          topics: lockFilter.topics,
          fromBlock: 18000000,
          toBlock: "latest",
        })

        const parsedLockEvents = lockLogs
          .map((log) => {
            try {
              const parsedLog = stakingContract.interface.parseLog(log)
              return {
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber,
                amount: parsedLog.args[1]?.toString() || "Unknown",
                timestamp: 0,
              }
            } catch (err) {
              console.warn("Error parsing lock log:", err)
              return null
            }
          })
          .filter(Boolean)

        // Get block timestamps
        for (const event of parsedLockEvents) {
          const block = await provider.getBlock(event.blockNumber)
          if (block) {
            event.timestamp = block.timestamp
          }
        }

        setLockEvents(parsedLockEvents)
      }

      // Get token transfer events
      const transferFilter = tokenContract.filters.Transfer(null, address)
      const transferLogs = await provider.getLogs({
        address: OPUS_TOKEN_ADDRESS,
        topics: transferFilter.topics,
        fromBlock: 18000000,
        toBlock: "latest",
      })

      const parsedTransferEvents = transferLogs
        .map((log) => {
          try {
            const parsedLog = tokenContract.interface.parseLog(log)
            return {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
              from: parsedLog.args[0],
              to: parsedLog.args[1],
              amount: parsedLog.args[2].toString(),
              timestamp: 0,
            }
          } catch (err) {
            console.warn("Error parsing transfer log:", err)
            return null
          }
        })
        .filter(Boolean)

      // Get block timestamps
      for (const event of parsedTransferEvents) {
        const block = await provider.getBlock(event.blockNumber)
        if (block) {
          event.timestamp = block.timestamp
        }
      }

      // Filter for transfers from staking contract to user
      const relevantTransfers = parsedTransferEvents.filter(
        (event) => event.from.toLowerCase() === STAKING_CONTRACT_ADDRESS.toLowerCase(),
      )

      setTokenEvents(relevantTransfers)

      toast({
        title: "Data Retrieved",
        description: "Successfully retrieved lock information",
      })
    } catch (err: any) {
      console.error("Error getting lock info:", err)
      setError(err.message || "Failed to get lock info")

      toast({
        title: "Error",
        description: "Failed to get lock info. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Test unlock function
  const testUnlock = async () => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to test unlocking",
        variant: "destructive",
      })
      return
    }

    if (!lockId) {
      toast({
        title: "No Lock ID",
        description: "Please enter a lock ID to unlock",
        variant: "destructive",
      })
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

      console.log("Unlocking lock with ID:", lockId)

      // Call unlock with an array of lock IDs
      const tx = await contract.unlock([lockId])

      toast({
        title: "Transaction Sent",
        description: "Unlock transaction has been sent to the network",
      })

      await tx.wait()

      toast({
        title: "Unlock Successful",
        description: "Transaction completed successfully. Refreshing data...",
      })

      // Refresh data
      await getLockInfo()
    } catch (err: any) {
      console.error("Unlock error:", err)
      toast({
        title: "Unlock Failed",
        description: err.message || "Failed to unlock tokens. See console for details.",
        variant: "destructive",
      })
    }
  }

  // Format timestamp to date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString() + " " + new Date(timestamp * 1000).toLocaleTimeString()
  }

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return ""
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Check if a lock is unlockable (past end time)
  const isUnlockable = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000)
    return now > endTime
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Unlock Analyzer</h1>
      <p className="text-muted-foreground mb-6">Analyze specific lock IDs and unlock attempts</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lock Information</CardTitle>
          <CardDescription>Enter wallet address and lock ID to analyze</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
              className="flex-grow"
            />
            <Input value={lockId} onChange={(e) => setLockId(e.target.value)} placeholder="Lock ID" className="w-24" />
            <Button onClick={getLockInfo} disabled={loading || !address || !lockId}>
              {loading ? "Loading..." : "Check Lock"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {userInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Information from the staking contract</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium">Total Staked</p>
                <p className="text-sm">{ethers.formatUnits(userInfo.amount, 18)} OPUS</p>
              </div>
              <div>
                <p className="text-xs font-medium">Locked Amount</p>
                <p className="text-sm">{ethers.formatUnits(userInfo.locked, 18)} OPUS</p>
              </div>
              <div>
                <p className="text-xs font-medium">Start Time</p>
                <p className="text-sm">{formatDate(userInfo.startTime)}</p>
              </div>
              <div>
                <p className="text-xs font-medium">Total Claimed</p>
                <p className="text-sm">{ethers.formatUnits(userInfo.claimed, 18)} OPUS</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {lockInfo ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Lock Details</CardTitle>
            <CardDescription>Information about lock ID {lockInfo.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium">Lock ID</p>
                  <p className="text-sm">{lockInfo.id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium">Amount</p>
                  <p className="text-sm">{ethers.formatUnits(lockInfo.amount, 18)} OPUS</p>
                </div>
                <div>
                  <p className="text-xs font-medium">Start Time</p>
                  <p className="text-sm">{formatDate(lockInfo.startTime)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium">End Time</p>
                  <p className="text-sm">{formatDate(lockInfo.endTime)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium">Lock Period</p>
                  <p className="text-sm">{Math.floor((lockInfo.endTime - lockInfo.startTime) / (24 * 60 * 60))} days</p>
                </div>
                <div>
                  <p className="text-xs font-medium">Status</p>
                  <p className={`text-sm ${isUnlockable(lockInfo.endTime) ? "text-green-500" : "text-yellow-500"}`}>
                    {isUnlockable(lockInfo.endTime) ? "Unlockable" : "Locked"}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={testUnlock} disabled={!account || !isUnlockable(lockInfo.endTime)}>
                  Test Unlock
                </Button>
              </div>

              {!isUnlockable(lockInfo.endTime) && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <p className="text-sm text-yellow-500">
                    <strong>Note:</strong> This lock is not yet unlockable. The lock period ends on{" "}
                    {formatDate(lockInfo.endTime)}.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        userInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Lock Not Found</CardTitle>
              <CardDescription>No lock found with ID {lockId}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <p className="text-sm text-yellow-500">
                  <strong>Note:</strong> No lock was found with ID {lockId} for this address. This could mean:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-500 mt-2">
                  <li>The lock never existed</li>
                  <li>The lock has already been unlocked</li>
                  <li>The lock ID is incorrect</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )
      )}

      <Tabs defaultValue="events" className="w-full mb-6">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="events">Event History</TabsTrigger>
          <TabsTrigger value="transfers">Token Transfers</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Lock/Unlock Events</CardTitle>
              <CardDescription>History of lock and unlock events for this address</CardDescription>
            </CardHeader>
            <CardContent>
              {lockEvents.length > 0 || unlockEvents.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Lock Events</h3>
                  {lockEvents.length > 0 ? (
                    <div className="space-y-2">
                      {lockEvents.map((event, index) => (
                        <div key={index} className="p-3 bg-muted rounded-md">
                          <div className="flex justify-between">
                            <p className="text-xs">
                              <span className="font-medium">Amount:</span> {ethers.formatUnits(event.amount, 18)} OPUS
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            TX: {formatAddress(event.transactionHash)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No lock events found</p>
                  )}

                  <h3 className="text-sm font-medium mt-6">Unlock Events</h3>
                  {unlockEvents.length > 0 ? (
                    <div className="space-y-2">
                      {unlockEvents.map((event, index) => (
                        <div key={index} className="p-3 bg-muted rounded-md">
                          <div className="flex justify-between">
                            <p className="text-xs">
                              <span className="font-medium">Amount:</span> {ethers.formatUnits(event.amount, 18)} OPUS
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            TX: {formatAddress(event.transactionHash)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No unlock events found</p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">No lock or unlock events found for this address</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <CardTitle>Token Transfers</CardTitle>
              <CardDescription>Token transfers from staking contract to user</CardDescription>
            </CardHeader>
            <CardContent>
              {tokenEvents.length > 0 ? (
                <div className="space-y-2">
                  {tokenEvents.map((event, index) => (
                    <div key={index} className="p-3 bg-muted rounded-md">
                      <div className="flex justify-between">
                        <p className="text-xs">
                          <span className="font-medium">Amount:</span> {ethers.formatUnits(event.amount, 18)} OPUS
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {formatAddress(event.from)} To: {formatAddress(event.to)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">TX: {formatAddress(event.transactionHash)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">
                    No token transfers found from staking contract to this address
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Unlock Analysis</CardTitle>
              <CardDescription>Understanding the unlock process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-sm text-blue-500">
                    <strong>Raw Trace Analysis:</strong> The trace you provided shows a call to the <code>unlock</code>{" "}
                    function with lock ID 2 passed as an array parameter. The transaction completed without errors, but
                    there are no subtraces showing token transfers.
                  </p>
                </div>

                <h3 className="text-sm font-medium">Possible Issues:</h3>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                  <li>
                    <strong>Lock Period Not Ended:</strong> If the lock period hasn't ended yet, the unlock function
                    might succeed (no revert) but not actually unlock the tokens.
                  </li>
                  <li>
                    <strong>Lock Already Unlocked:</strong> If the lock has already been unlocked, the function might
                    succeed but not emit events or transfer tokens.
                  </li>
                  <li>
                    <strong>Lock ID Doesn't Exist:</strong> If the lock ID doesn't exist for your address, the function
                    might not revert but also not do anything.
                  </li>
                  <li>
                    <strong>Contract Implementation Issue:</strong> The contract might have a bug where it doesn't
                    properly transfer tokens or emit events on unlock.
                  </li>
                </ol>

                <h3 className="text-sm font-medium">Recommendations:</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                  <li>Check if lock ID 2 exists and is unlockable using this tool</li>
                  <li>Try unlocking with different lock IDs (use the Lock Fix V4 tool to scan for all your locks)</li>
                  <li>Check if there's a separate claim function that needs to be called after unlocking</li>
                  <li>
                    Contact the contract developers if all else fails, as there might be a contract implementation issue
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

