"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OPUS_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS, OPUS_TOKEN_ABI, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LockRelationshipPage() {
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [stakingInfo, setStakingInfo] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const { account } = useBlockchain()

  // Auto-fill connected wallet address
  useEffect(() => {
    if (account) {
      setAddress(account)
    }
  }, [account])

  const fetchData = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)
    setTokenInfo(null)
    setStakingInfo(null)
    setEvents([])

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const tokenContract = new ethers.Contract(OPUS_TOKEN_ADDRESS, OPUS_TOKEN_ABI, provider)
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Get token information
      const [balance, lockedAmount] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.lockedAmount ? tokenContract.lockedAmount(address) : ethers.parseUnits("0", 18),
      ])

      setTokenInfo({
        balance: balance.toString(),
        lockedAmount: lockedAmount.toString(),
        availableBalance: (balance - lockedAmount).toString(),
      })

      // Get staking information
      try {
        const userInfo = await stakingContract.mapUserInfo(address)
        setStakingInfo({
          amount: userInfo.amount.toString(),
          locked: userInfo.locked.toString(),
          startTime: Number(userInfo.startTime),
          claimed: userInfo.claimed.toString(),
          lockClaimed: userInfo.lockClaimed?.toString() || "0",
          pendingToClaimed: userInfo.pendingToClaimed?.toString() || "0",
        })
      } catch (err) {
        console.error("Error fetching staking info:", err)
        setStakingInfo({ error: "Failed to fetch staking info" })
      }

      // Fetch lock/unlock events
      try {
        // Look for LockToken and UnLockToken events from the token contract
        const lockFilter = tokenContract.filters.LockToken?.()
        const unlockFilter = tokenContract.filters.UnLockToken?.()

        let lockEvents = []
        let unlockEvents = []

        if (lockFilter) {
          const lockLogs = await provider.getLogs({
            address: OPUS_TOKEN_ADDRESS,
            topics: lockFilter.topics || [],
            fromBlock: ethers.toBeHex(0),
            toBlock: "latest",
          })

          lockEvents = lockLogs
            .map((log) => {
              try {
                const parsedLog = tokenContract.interface.parseLog(log)
                return {
                  type: "Lock",
                  amount: parsedLog.args.amount.toString(),
                  user: parsedLog.args.user,
                  blockNumber: log.blockNumber,
                  transactionHash: log.transactionHash,
                }
              } catch (e) {
                return null
              }
            })
            .filter(Boolean)
        }

        if (unlockFilter) {
          const unlockLogs = await provider.getLogs({
            address: OPUS_TOKEN_ADDRESS,
            topics: unlockFilter.topics || [],
            fromBlock: ethers.toBeHex(0),
            toBlock: "latest",
          })

          unlockEvents = unlockLogs
            .map((log) => {
              try {
                const parsedLog = tokenContract.interface.parseLog(log)
                return {
                  type: "Unlock",
                  amount: parsedLog.args.amount.toString(),
                  user: parsedLog.args.user,
                  blockNumber: log.blockNumber,
                  transactionHash: log.transactionHash,
                }
              } catch (e) {
                return null
              }
            })
            .filter(Boolean)
        }

        // Filter events for this user
        const userEvents = [...lockEvents, ...unlockEvents]
          .filter((event) => event.user.toLowerCase() === address.toLowerCase())
          .sort((a, b) => b.blockNumber - a.blockNumber) // Sort by block number (descending)

        setEvents(userEvents)
      } catch (err) {
        console.error("Error fetching events:", err)
      }

      toast({
        title: "Data Fetched",
        description: "Token and staking information retrieved successfully",
      })
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message || "Failed to fetch data")

      toast({
        title: "Error",
        description: "Failed to fetch data. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Test lock function
  const testLock = async (amount: string, days: number) => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to test locking",
        variant: "destructive",
      })
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount, 18)

      console.log(`Attempting to lock ${amount} OPUS for ${days} days`)
      const tx = await stakingContract.lock(amountWei, days)

      toast({
        title: "Transaction Sent",
        description: "Lock transaction has been sent to the network",
      })

      await tx.wait()

      toast({
        title: "Lock Successful",
        description: `Successfully locked ${amount} OPUS for ${days} days`,
      })

      // Refresh data
      await fetchData()
    } catch (err: any) {
      console.error("Lock error:", err)
      toast({
        title: "Lock Failed",
        description: err.message || "Failed to lock tokens. See console for details.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Lock Relationship Analyzer</h1>
      <p className="text-muted-foreground mb-6">
        Analyzes the relationship between token contract locks and staking contract locks
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Query Address</CardTitle>
          <CardDescription>Enter an address to analyze its lock data across both contracts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
            />
            <Button onClick={fetchData} disabled={loading || !address}>
              {loading ? "Fetching..." : "Analyze Locks"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full mb-6">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Lock Events</TabsTrigger>
          <TabsTrigger value="test">Test Lock</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Token Contract Info */}
            <Card>
              <CardHeader>
                <CardTitle>Token Contract</CardTitle>
                <CardDescription>Information from the OPUS token contract</CardDescription>
              </CardHeader>
              <CardContent>
                {tokenInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs font-medium">Total Balance</p>
                        <p className="text-sm">{ethers.formatUnits(tokenInfo.balance, 18)} OPUS</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Locked Amount</p>
                        <p className="text-sm">{ethers.formatUnits(tokenInfo.lockedAmount, 18)} OPUS</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Available Balance</p>
                        <p className="text-sm">{ethers.formatUnits(tokenInfo.availableBalance, 18)} OPUS</p>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <p className="text-xs text-blue-500">
                        <strong>Note:</strong> The token contract only tracks the total locked amount, not individual
                        locks.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted rounded-md text-center">
                    <p className="text-sm text-muted-foreground">
                      {loading ? "Fetching token info..." : "No token info available yet."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staking Contract Info */}
            <Card>
              <CardHeader>
                <CardTitle>Staking Contract</CardTitle>
                <CardDescription>Information from the staking contract</CardDescription>
              </CardHeader>
              <CardContent>
                {stakingInfo ? (
                  stakingInfo.error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                      <p className="text-sm text-red-500">{stakingInfo.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs font-medium">Staked Amount</p>
                          <p className="text-sm">{ethers.formatUnits(stakingInfo.amount, 18)} OPUS</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Locked Amount</p>
                          <p className="text-sm">{ethers.formatUnits(stakingInfo.locked, 18)} OPUS</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Start Time</p>
                          <p className="text-sm">{new Date(stakingInfo.startTime * 1000).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Total Claimed</p>
                          <p className="text-sm">{ethers.formatUnits(stakingInfo.claimed, 18)} OPUS</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Lock Claimed</p>
                          <p className="text-sm">{ethers.formatUnits(stakingInfo.lockClaimed, 18)} OPUS</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Pending To Claim</p>
                          <p className="text-sm">{ethers.formatUnits(stakingInfo.pendingToClaimed, 18)} OPUS</p>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <p className="text-xs text-blue-500">
                          <strong>Note:</strong> The staking contract may track individual locks, but it also maintains
                          a total locked amount.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-muted rounded-md text-center">
                    <p className="text-sm text-muted-foreground">
                      {loading ? "Fetching staking info..." : "No staking info available yet."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comparison */}
          {tokenInfo && stakingInfo && !stakingInfo.error && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Lock Comparison</CardTitle>
                <CardDescription>Comparing lock data between contracts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium">Token Contract Locked</p>
                      <p className="text-xl">{ethers.formatUnits(tokenInfo.lockedAmount, 18)} OPUS</p>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium">Staking Contract Locked</p>
                      <p className="text-xl">{ethers.formatUnits(stakingInfo.locked, 18)} OPUS</p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium">Difference</p>
                    <p className="text-xl">
                      {ethers.formatUnits(BigInt(tokenInfo.lockedAmount) - BigInt(stakingInfo.locked), 18)} OPUS
                    </p>
                    {BigInt(tokenInfo.lockedAmount) !== BigInt(stakingInfo.locked) && (
                      <p className="text-xs text-red-500 mt-1">
                        Warning: The locked amounts in the two contracts don't match!
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <p className="text-xs text-blue-500">
                      <strong>Analysis:</strong> The token contract prevents transfers of locked tokens, while the
                      staking contract tracks the details of each lock (amount, duration, etc.). These values should
                      match if everything is working correctly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Lock Events</CardTitle>
              <CardDescription>History of lock and unlock events for this address</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-md ${
                        event.type === "Lock"
                          ? "bg-green-500/10 border border-green-500/20"
                          : "bg-red-500/10 border border-red-500/20"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{event.type === "Lock" ? "🔒 Lock" : "🔓 Unlock"}</p>
                          <p className="text-xs text-muted-foreground">
                            Amount: {ethers.formatUnits(event.amount, 18)} OPUS
                          </p>
                        </div>
                        <a
                          href={`https://scan.pulsechain.com/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          View Transaction
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">
                    {loading ? "Fetching events..." : "No lock or unlock events found for this address."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Lock Function</CardTitle>
              <CardDescription>Create a test lock to see how it works</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Amount to Lock</label>
                    <Input id="lockAmount" placeholder="e.g., 100" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Lock Period (Days)</label>
                    <Input id="lockDays" placeholder="e.g., 90" className="mt-1" />
                  </div>
                </div>

                <Button
                  onClick={() => {
                    const amountInput = document.getElementById("lockAmount") as HTMLInputElement
                    const daysInput = document.getElementById("lockDays") as HTMLInputElement

                    const amount = amountInput?.value
                    const days = Number.parseInt(daysInput?.value || "0")

                    if (!amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
                      toast({
                        title: "Invalid Amount",
                        description: "Please enter a valid amount to lock",
                        variant: "destructive",
                      })
                      return
                    }

                    if (isNaN(days) || days < 90) {
                      toast({
                        title: "Invalid Period",
                        description: "Lock period must be at least 90 days",
                        variant: "destructive",
                      })
                      return
                    }

                    testLock(amount, days)
                  }}
                  className="w-full"
                >
                  Create Test Lock
                </Button>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-xs text-blue-500">
                    <strong>Note:</strong> This will create a real lock on the blockchain. Make sure you're using a
                    small amount for testing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Understanding the Lock System</CardTitle>
          <CardDescription>How locking works across both contracts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Based on the contract code, here's how the locking system appears to work:
            </p>

            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>
                <strong>Token Contract:</strong> Uses a simple mapping to track the total amount of tokens locked for
                each user. It doesn't store individual locks with details like start time, end time, etc.
              </li>
              <li>
                <strong>Staking Contract:</strong> Manages the details of individual locks (amount, duration, etc.) and
                calls functions on the token contract to update the total locked amount.
              </li>
              <li>
                <strong>Lock Creation:</strong> When you lock tokens, the staking contract records the lock details and
                calls the token contract to update your total locked amount.
              </li>
              <li>
                <strong>Unlock Process:</strong> When you unlock tokens, the staking contract verifies the lock details
                and calls the token contract to reduce your total locked amount.
              </li>
            </ol>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-sm text-blue-500">
                <strong>Key Insight:</strong> The token contract only knows the total amount locked, while the staking
                contract knows the details of each individual lock. This explains why we've been having trouble finding
                individual locks - they're stored in the staking contract's internal data structures, not directly
                accessible through public functions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

