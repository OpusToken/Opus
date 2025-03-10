"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ContractInspectorPage() {
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [transactionHash, setTransactionHash] = useState("")
  const [transactionDetails, setTransactionDetails] = useState<any>(null)
  const [lockIds, setLockIds] = useState<number[]>([])
  const [manualLockId, setManualLockId] = useState("")
  const [lockInfo, setLockInfo] = useState<any>(null)
  const { account } = useBlockchain()

  // Auto-fill connected wallet address
  useEffect(() => {
    if (account) {
      setAddress(account)
    }
  }, [account])

  // Function to get user info
  const getUserInfo = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Get user info
      const info = await contract.mapUserInfo(address)
      setUserInfo({
        amount: info.amount.toString(),
        rewardDebt: info.rewardDebt.toString(),
        startTime: Number(info.startTime),
        claimed: info.claimed.toString(),
        lockClaimed: info.lockClaimed.toString(),
        locked: info.locked.toString(),
        pendingToClaimed: info.pendingToClaimed.toString(),
      })

      toast({
        title: "User Info Retrieved",
        description: "Successfully retrieved user information from the contract",
      })
    } catch (err: any) {
      console.error("Error getting user info:", err)
      setError(err.message || "Failed to get user info")

      toast({
        title: "Error",
        description: "Failed to get user info. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to get lock events
  const getLockEvents = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      // Create a filter for Transfer events to the staking contract
      // This is a common pattern - tokens are transferred to the contract when locking
      const opusTokenContract = new ethers.Contract(
        "0x64aa120986030627C3E1419B09ce604e21B9B0FE", // OPUS token address
        ["event Transfer(address indexed from, address indexed to, uint256 value)"],
        provider,
      )

      // Get the last 1000 blocks
      const currentBlock = await provider.getBlockNumber()
      const fromBlock = currentBlock - 1000

      // Filter for transfers from the user to the staking contract
      const filter = opusTokenContract.filters.Transfer(address, STAKING_CONTRACT_ADDRESS)
      const logs = await opusTokenContract.queryFilter(filter, fromBlock, currentBlock)

      console.log("Transfer logs:", logs)

      // Format the events
      const formattedEvents = await Promise.all(
        logs.map(async (log) => {
          const block = await log.getBlock()
          const tx = await log.getTransaction()

          return {
            blockNumber: log.blockNumber,
            blockTime: new Date(block.timestamp * 1000).toLocaleString(),
            transactionHash: log.transactionHash,
            from: log.args[0],
            to: log.args[1],
            value: ethers.formatUnits(log.args[2], 18),
            data: tx.data,
          }
        }),
      )

      setEvents(formattedEvents)

      toast({
        title: "Events Retrieved",
        description: `Found ${formattedEvents.length} transfer events to the staking contract`,
      })
    } catch (err: any) {
      console.error("Error getting events:", err)
      setError(err.message || "Failed to get events")

      toast({
        title: "Error",
        description: "Failed to get events. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to analyze a transaction
  const analyzeTransaction = async () => {
    if (!transactionHash) {
      setError("Please enter a transaction hash")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      // Get transaction details
      const tx = await provider.getTransaction(transactionHash)
      const receipt = await provider.getTransactionReceipt(transactionHash)

      if (!tx || !receipt) {
        throw new Error("Transaction not found")
      }

      // Get block information
      const block = await provider.getBlock(receipt.blockNumber)

      // Format the transaction details
      const details = {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        blockTime: block ? new Date(block.timestamp * 1000).toLocaleString() : "Unknown",
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? "Success" : "Failed",
        data: tx.data,
        logs: receipt.logs.map((log) => ({
          address: log.address,
          topics: log.topics,
          data: log.data,
        })),
      }

      setTransactionDetails(details)

      toast({
        title: "Transaction Analyzed",
        description: "Successfully analyzed the transaction",
      })
    } catch (err: any) {
      console.error("Error analyzing transaction:", err)
      setError(err.message || "Failed to analyze transaction")

      toast({
        title: "Error",
        description: "Failed to analyze transaction. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to scan for lock IDs
  const scanForLockIds = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Get user info first to check if they have any locked tokens
      const info = await contract.mapUserInfo(address)

      if (info.locked.toString() === "0") {
        toast({
          title: "No Locked Tokens",
          description: "This address doesn't have any locked tokens according to mapUserInfo",
        })
        setLockIds([])
        setLoading(false)
        return
      }

      console.log("User has locked tokens:", info.locked.toString())

      // Scan for lock IDs by checking mapUserInfoLock for each potential ID
      const foundIds = []
      const MAX_ID_TO_CHECK = 100 // Limit how many IDs we check

      for (let i = 0; i < MAX_ID_TO_CHECK; i++) {
        try {
          const lockInfo = await contract.mapUserInfoLock(address, i)

          // If the lock has a non-zero amount, it's a valid lock
          if (lockInfo && lockInfo.amount.toString() !== "0") {
            console.log(`Found lock at ID ${i}:`, lockInfo)
            foundIds.push(i)
          }
        } catch (err) {
          // Ignore errors - likely means no lock at this ID
        }

        // Update progress every 10 IDs
        if (i % 10 === 0) {
          toast({
            title: "Scanning Progress",
            description: `Checked ${i} potential lock IDs...`,
          })
        }
      }

      setLockIds(foundIds)

      toast({
        title: "Lock ID Scan Complete",
        description: `Found ${foundIds.length} lock IDs for this address`,
      })
    } catch (err: any) {
      console.error("Error scanning for lock IDs:", err)
      setError(err.message || "Failed to scan for lock IDs")

      toast({
        title: "Error",
        description: "Failed to scan for lock IDs. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to get lock info for a specific ID
  const getLockInfo = async () => {
    if (!address || !manualLockId) {
      setError("Please enter both an address and a lock ID")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Get lock info
      const info = await contract.mapUserInfoLock(address, manualLockId)

      setLockInfo({
        id: manualLockId,
        amount: info.amount.toString(),
        startTime: Number(info.startTime),
        endTime: Number(info.endTime),
        rewardDebt: info.rewardDebt.toString(),
      })

      toast({
        title: "Lock Info Retrieved",
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

  // Format timestamp to date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Contract Inspector</h1>
      <p className="text-muted-foreground mb-6">Advanced tool to inspect contract state and transactions</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Wallet Address</CardTitle>
          <CardDescription>Enter the wallet address to inspect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
            />
            <Button variant="outline" onClick={() => setAddress(account || "")} disabled={!account}>
              Use Connected Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="userInfo" className="w-full mb-6">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="userInfo">User Info</TabsTrigger>
          <TabsTrigger value="lockIds">Lock IDs</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="transaction">Transaction</TabsTrigger>
        </TabsList>

        <TabsContent value="userInfo">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Get user information from the contract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={getUserInfo} disabled={loading || !address}>
                {loading ? "Loading..." : "Get User Info"}
              </Button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {userInfo && (
                <div className="p-4 bg-muted rounded-md">
                  <h3 className="font-medium mb-2">User Info</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Amount:</p>
                      <p>{ethers.formatUnits(userInfo.amount, 18)} OPUS</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Locked Amount:</p>
                      <p>{ethers.formatUnits(userInfo.locked, 18)} OPUS</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Time:</p>
                      <p>{formatDate(userInfo.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Claimed:</p>
                      <p>{ethers.formatUnits(userInfo.claimed, 18)} OPUS</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lock Claimed:</p>
                      <p>{ethers.formatUnits(userInfo.lockClaimed, 18)} OPUS</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending To Claimed:</p>
                      <p>{ethers.formatUnits(userInfo.pendingToClaimed, 18)} OPUS</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reward Debt:</p>
                      <p>{ethers.formatUnits(userInfo.rewardDebt, 18)} OPUS</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="text-sm text-blue-500">
                  <strong>Note:</strong> This shows the user's overall staking information, including the total amount
                  of tokens they have locked.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lockIds">
          <Card>
            <CardHeader>
              <CardTitle>Lock IDs</CardTitle>
              <CardDescription>Scan for lock IDs and get lock information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Scan for Lock IDs</h3>
                  <Button onClick={scanForLockIds} disabled={loading || !address} className="w-full">
                    {loading ? "Scanning..." : "Scan for Lock IDs"}
                  </Button>

                  {lockIds.length > 0 ? (
                    <div className="mt-4 p-4 bg-muted rounded-md">
                      <h4 className="text-sm font-medium mb-2">Found {lockIds.length} Lock IDs:</h4>
                      <div className="flex flex-wrap gap-2">
                        {lockIds.map((id) => (
                          <Button
                            key={id}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setManualLockId(id.toString())
                              getLockInfo()
                            }}
                          >
                            ID: {id}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-muted rounded-md text-center">
                      <p className="text-sm text-muted-foreground">
                        {loading ? "Scanning for lock IDs..." : "No lock IDs found yet"}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Check Specific Lock ID</h3>
                  <div className="flex space-x-2 mb-4">
                    <Input
                      value={manualLockId}
                      onChange={(e) => setManualLockId(e.target.value)}
                      placeholder="Enter lock ID"
                    />
                    <Button onClick={getLockInfo} disabled={loading || !address || !manualLockId}>
                      Check
                    </Button>
                  </div>

                  {lockInfo && (
                    <div className="p-4 bg-muted rounded-md">
                      <h4 className="text-sm font-medium mb-2">Lock Info (ID: {lockInfo.id})</h4>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount:</p>
                          <p>{ethers.formatUnits(lockInfo.amount, 18)} OPUS</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Start Time:</p>
                          <p>{formatDate(lockInfo.startTime)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">End Time:</p>
                          <p>{formatDate(lockInfo.endTime)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Lock Period:</p>
                          <p>{Math.floor((lockInfo.endTime - lockInfo.startTime) / (24 * 60 * 60))} days</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reward Debt:</p>
                          <p>{ethers.formatUnits(lockInfo.rewardDebt, 18)} OPUS</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="text-sm text-blue-500">
                  <strong>Note:</strong> This tool scans for lock IDs by checking the mapUserInfoLock mapping for each
                  potential ID. It will find all active locks for the address.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Events</CardTitle>
              <CardDescription>Find token transfers to the staking contract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={getLockEvents} disabled={loading || !address}>
                {loading ? "Loading..." : "Get Transfer Events"}
              </Button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {events.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium">Found {events.length} Transfer Events:</h3>
                  {events.map((event, index) => (
                    <div key={index} className="p-4 bg-muted rounded-md">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Block:</p>
                          <p>{event.blockNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time:</p>
                          <p>{event.blockTime}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">From:</p>
                          <p className="truncate">{event.from}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">To:</p>
                          <p className="truncate">{event.to}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Value:</p>
                          <p>{event.value} OPUS</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTransactionHash(event.transactionHash)
                            analyzeTransaction()
                          }}
                        >
                          Analyze Transaction
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">
                    {loading ? "Loading events..." : "No events found yet"}
                  </p>
                </div>
              )}

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="text-sm text-blue-500">
                  <strong>Note:</strong> This shows token transfers from the user to the staking contract, which
                  typically happen when staking or locking tokens.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transaction">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Analysis</CardTitle>
              <CardDescription>Analyze a specific transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="Enter transaction hash (0x...)"
                />
                <Button onClick={analyzeTransaction} disabled={loading || !transactionHash}>
                  {loading ? "Analyzing..." : "Analyze"}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {transactionDetails && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="font-medium mb-2">Transaction Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Hash:</p>
                        <p className="truncate">{transactionDetails.hash}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Block:</p>
                        <p>{transactionDetails.blockNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Time:</p>
                        <p>{transactionDetails.blockTime}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status:</p>
                        <p>{transactionDetails.status}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">From:</p>
                        <p className="truncate">{transactionDetails.from}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">To:</p>
                        <p className="truncate">{transactionDetails.to}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Value:</p>
                        <p>{transactionDetails.value} PLS</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gas Used:</p>
                        <p>{transactionDetails.gasUsed}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="font-medium mb-2">Transaction Data</h3>
                    <div className="text-sm overflow-auto">
                      <pre className="text-xs">{transactionDetails.data}</pre>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="font-medium mb-2">Event Logs ({transactionDetails.logs.length})</h3>
                    {transactionDetails.logs.map((log, index) => (
                      <div key={index} className="mb-4 pb-4 border-b border-border last:border-0">
                        <p className="text-xs font-medium">Log {index + 1}</p>
                        <p className="text-xs text-muted-foreground">Address: {log.address}</p>
                        <div className="mt-1">
                          <p className="text-xs font-medium">Topics:</p>
                          {log.topics.map((topic, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">
                              {topic}
                            </p>
                          ))}
                        </div>
                        <div className="mt-1">
                          <p className="text-xs font-medium">Data:</p>
                          <p className="text-xs text-muted-foreground truncate">{log.data}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="text-sm text-blue-500">
                  <strong>Note:</strong> This analyzes a specific transaction to see what happened during lock creation
                  or other contract interactions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
          <CardDescription>Understanding the contract structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Based on the contract code snippets and interface, we know:</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>
                The contract stores locks in a mapping called <code>mapUserInfoLock[userAddress][lockID]</code>
              </li>
              <li>
                The <code>unlock</code> function takes an array of lock IDs, not a single ID
              </li>
              <li>Locks have properties: amount, startTime, endTime, and rewardDebt</li>
              <li>The contract doesn't have a function to list all lock IDs for a user</li>
            </ol>

            <p className="text-sm text-muted-foreground mt-4">This tool helps determine:</p>

            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>If the user has any locked tokens according to mapUserInfo</li>
              <li>What lock IDs exist for the user by scanning the mapUserInfoLock mapping</li>
              <li>The details of each lock</li>
              <li>The transaction history related to locking</li>
            </ol>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-sm text-blue-500">
                <strong>Next Steps:</strong> After running the diagnostics, please share the results to help identify
                the exact issue with lock data retrieval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

