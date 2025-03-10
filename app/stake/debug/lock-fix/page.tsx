"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchUserLocksFromContract, applyLockFetchFix } from "@/contexts/blockchain-context-fix"
import { useBlockchain } from "@/contexts/blockchain-context"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LockFixPage() {
  const [address, setAddress] = useState("")
  const [locks, setLocks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fixApplied, setFixApplied] = useState(false)
  const { account, refreshBalances, userLocks } = useBlockchain()

  // Auto-fill connected wallet address
  useEffect(() => {
    if (account) {
      setAddress(account)
    }
  }, [account])

  // Apply the fix on mount
  useEffect(() => {
    applyLockFetchFix()
    setFixApplied(true)
  }, [])

  // Function to fetch locks
  const fetchLocks = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fetchedLocks = await fetchUserLocksFromContract(address)
      setLocks(fetchedLocks)

      if (fetchedLocks.length > 0) {
        toast({
          title: "Locks Found",
          description: `Successfully found ${fetchedLocks.length} locks for this address.`,
        })
      } else {
        toast({
          title: "No Locks Found",
          description: "No locks were found for this address.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Error fetching locks:", err)
      setError(err.message || "An error occurred while fetching locks")

      toast({
        title: "Error",
        description: "Failed to fetch locks. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to apply the fix and refresh
  const applyFixAndRefresh = async () => {
    applyLockFetchFix()
    setFixApplied(true)

    toast({
      title: "Fix Applied",
      description: "The lock fetch fix has been applied. Refreshing data...",
    })

    // Refresh balances to apply the fix
    await refreshBalances()

    toast({
      title: "Refresh Complete",
      description: "Data has been refreshed with the fix applied.",
    })
  }

  // Unlock a lock (using the patched unlock function)
  const handleUnlock = async (lockId: string) => {
    if (!window.unlockPatch) {
      toast({
        title: "Error",
        description: "Unlock patch not available. Apply the fix first.",
        variant: "destructive",
      })
      return
    }

    try {
      const success = await window.unlockPatch(lockId)

      if (success) {
        toast({
          title: "Unlock Successful",
          description: `Successfully unlocked lock ID: ${lockId}`,
        })
        // Refresh after unlock
        await refreshBalances()
        fetchLocks()
      } else {
        toast({
          title: "Unlock Failed",
          description: "Failed to unlock. See console for details.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error unlocking:", err)
      toast({
        title: "Error",
        description: "An error occurred while unlocking.",
        variant: "destructive",
      })
    }
  }

  // Format timestamp to date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Format amount
  const formatAmount = (amount: bigint | string | number) => {
    if (typeof amount === "bigint") {
      return ethers.formatUnits(amount, 18)
    } else if (typeof amount === "string") {
      return ethers.formatUnits(BigInt(amount), 18)
    } else {
      return ethers.formatUnits(BigInt(Math.floor(amount)), 18)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Lock Fix Tool</h1>
      <p className="text-muted-foreground mb-6">
        This tool applies a targeted fix for retrieving lock data from the staking contract.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Apply Fix</CardTitle>
          <CardDescription>Apply the lock fetch fix to the blockchain context</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="text-sm text-blue-500">
              <strong>Status:</strong> {fixApplied ? "Fix has been applied" : "Fix not yet applied"}
            </p>
            <p className="text-sm text-blue-500 mt-2">
              This fix uses the getUserLockIds and getLockInfo methods to reliably fetch lock data, and corrects the
              unlock function to use an array of lock IDs as required by the contract.
            </p>
          </div>

          <Button className="w-full" onClick={applyFixAndRefresh}>
            Apply Fix & Refresh Data
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="test" className="w-full mb-6">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="test">Test Lock Fetch</TabsTrigger>
          <TabsTrigger value="current">Current Locks</TabsTrigger>
        </TabsList>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Lock Fetch</CardTitle>
              <CardDescription>Test fetching locks for a specific address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter wallet address (0x...)"
                />
                <Button onClick={fetchLocks} disabled={loading || !address}>
                  {loading ? "Fetching..." : "Fetch Locks"}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {locks.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Found {locks.length} locks:</p>

                  {locks.map((lock, index) => (
                    <div key={index} className="p-4 bg-muted rounded-md">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs font-medium">Lock ID</p>
                          <p className="text-sm">{lock.id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Amount</p>
                          <p className="text-sm">{formatAmount(lock.amount)} OPUS</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Start Date</p>
                          <p className="text-sm">{formatDate(lock.startTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">End Date</p>
                          <p className="text-sm">{formatDate(lock.endTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Lock Period</p>
                          <p className="text-sm">{lock.lockPeriod} days</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => handleUnlock(lock.id)}>
                        Unlock
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">
                    {loading ? "Fetching locks..." : "No locks found yet. Enter an address and click 'Fetch Locks'."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Locks</CardTitle>
              <CardDescription>Locks currently loaded in the blockchain context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userLocks && userLocks.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Found {userLocks.length} locks in the current context:</p>

                  {userLocks.map((lock, index) => (
                    <div key={index} className="p-4 bg-muted rounded-md">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs font-medium">Lock ID</p>
                          <p className="text-sm">{lock.id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Amount</p>
                          <p className="text-sm">{formatAmount(lock.amount)} OPUS</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Start Date</p>
                          <p className="text-sm">{formatDate(lock.startTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">End Date</p>
                          <p className="text-sm">{formatDate(lock.endTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Lock Period</p>
                          <p className="text-sm">{lock.lockPeriod} days</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">
                    No locks found in current context. Try applying the fix and refreshing.
                  </p>
                </div>
              )}

              <Button onClick={refreshBalances} className="w-full">
                Refresh Balances
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Implementation Instructions</CardTitle>
          <CardDescription>How to permanently fix the lock data issue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Based on the contract code, we've identified that:</p>

          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>
              The contract stores locks in a mapping called <code>mapUserInfoLock[userAddress][lockID]</code>
            </li>
            <li>
              The <code>unlock</code> function takes an array of lock IDs, not a single ID
            </li>
            <li>
              Locks need to be fetched by ID using <code>getUserLockIds</code> and <code>getLockInfo</code>
            </li>
          </ol>

          <div className="p-4 bg-muted rounded-md">
            <pre className="text-xs overflow-auto">
              {`// Replace the existing fetchUserLocks function with this implementation:

const fetchUserLocks = async (userAddress: string) => {
  if (!userAddress) {
    console.error("No user address provided for fetching locks")
    return []
  }

  console.log("Fetching locks for address:", userAddress)
  
  try {
    const provider = await getWorkingProvider()
    const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)
    
    // STEP 1: Get lock IDs first
    console.log("Getting lock IDs using getUserLockIds...")
    const lockIds = await stakingContract.getUserLockIds(userAddress)
    console.log(\`Found \${lockIds.length} lock IDs:\`, lockIds.map(id => id.toString()))
    
    if (!lockIds || lockIds.length === 0) {
      console.log("No lock IDs found")
      return []
    }
    
    // STEP 2: Get details for each lock ID
    console.log("Getting details for each lock ID...")
    const lockPromises = lockIds.map(async (id) => {
      try {
        console.log(\`Getting info for lock ID \${id.toString()}...\`)
        const lockInfo = await stakingContract.getLockInfo(id)
        
        // Format the lock data
        return {
          id: id.toString(),
          amount: lockInfo.amount || lockInfo[1] || 0n,
          startTime: Number(lockInfo.startTime || lockInfo[2] || 0),
          endTime: Number(lockInfo.endTime || lockInfo[3] || 0),
          lockPeriod: Math.floor(
            (Number(lockInfo.endTime || lockInfo[3] || 0) - 
             Number(lockInfo.startTime || lockInfo[2] || 0)) / (24 * 60 * 60)
          )
        }
      } catch (err) {
        console.error(\`Error getting lock info for ID \${id.toString()}:\`, err)
        return null
      }
    })
    
    const lockDetails = await Promise.all(lockPromises)
    const validLocks = lockDetails.filter(lock => lock !== null && 
                                      (typeof lock.amount === 'bigint' ? lock.amount > 0n : Number(lock.amount) > 0))
    
    console.log("Successfully retrieved locks:", validLocks)
    return validLocks
  } catch (err) {
    console.error("Error fetching user locks:", err)
    return []
  }
}`}
            </pre>
          </div>

          <p className="text-sm text-muted-foreground">
            Also update the <code>unlock</code> function to pass the lock ID as an array:
          </p>

          <div className="p-4 bg-muted rounded-md">
            <pre className="text-xs overflow-auto">
              {`// Update the unlock function to handle arrays:

const unlock = async (lockId: string) => {
  if (!account || !contracts.stakingContract || !provider) {
    toast({
      title: "Wallet not connected",
      description: "Please connect your wallet to unlock tokens.",
      variant: "destructive",
    })
    return false
  }

  setIsLoading(true)

  try {
    // Important: Pass lockId as an array since the contract function expects uint256[]
    const unlockTx = await contracts.stakingContract.unlock([lockId])
    await unlockTx.wait()

    // Refresh balances
    await refreshBalances()

    toast({
      title: "Unlocking successful",
      description: "You have successfully unlocked your tokens.",
    })

    return true
  } catch (error: any) {
    console.error("Error unlocking tokens:", error)

    if (error.code === 4001) {
      toast({
        title: "Transaction rejected",
        description: "You rejected the transaction.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Unlocking failed",
        description: error.message || "There was an error unlocking your tokens. Please try again.",
      })
    }

    return false
  } finally {
    setIsLoading(false)
  }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

