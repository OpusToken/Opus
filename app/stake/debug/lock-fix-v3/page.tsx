"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"
import { toast } from "@/components/ui/use-toast"

export default function LockFixV3Page() {
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [locks, setLocks] = useState<any[]>([])
  const { account } = useBlockchain()

  // Auto-fill connected wallet address
  useEffect(() => {
    if (account) {
      setAddress(account)
    }
  }, [account])

  const fetchUserData = async () => {
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
      setUserInfo(info)
      console.log("User Info:", info)

      // Find active locks
      const foundLocks = []
      let consecutiveEmptyLocks = 0
      const MAX_EMPTY_LOCKS = 5 // Stop after 5 consecutive empty locks

      // Start from 0 and increment until we find empty locks
      for (let i = 0; consecutiveEmptyLocks < MAX_EMPTY_LOCKS; i++) {
        try {
          const lockInfo = await contract.mapUserInfoLock(address, i)
          console.log(`Lock ${i}:`, lockInfo)

          if (lockInfo && lockInfo.amount > 0) {
            foundLocks.push({
              id: i,
              amount: lockInfo.amount,
              startTime: Number(lockInfo.startTime),
              endTime: Number(lockInfo.endTime),
              rewardDebt: lockInfo.rewardDebt,
            })
            consecutiveEmptyLocks = 0 // Reset counter when we find a lock
          } else {
            consecutiveEmptyLocks++
          }
        } catch (err) {
          console.log(`Error or no lock at index ${i}`)
          consecutiveEmptyLocks++
        }
      }

      setLocks(foundLocks)
      console.log("Found Locks:", foundLocks)

      if (foundLocks.length > 0) {
        toast({
          title: "Locks Found",
          description: `Found ${foundLocks.length} active locks`,
        })
      } else {
        toast({
          title: "No Locks",
          description: "No active locks found for this address",
        })
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message || "Failed to fetch user data")

      toast({
        title: "Error",
        description: "Failed to fetch user data. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Test unlock function
  const testUnlock = async (lockId: number) => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to test unlocking",
        variant: "destructive",
      })
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

      // Create array with single lock ID as required by contract
      const lockIdArray = [lockId]

      console.log("Attempting to unlock with ID array:", lockIdArray)
      const tx = await contract.unlock(lockIdArray)

      toast({
        title: "Transaction Sent",
        description: "Unlock transaction has been sent to the network",
      })

      await tx.wait()

      toast({
        title: "Unlock Successful",
        description: "The lock has been successfully unlocked",
      })

      // Refresh data
      await fetchUserData()
    } catch (err: any) {
      console.error("Unlock error:", err)
      toast({
        title: "Unlock Failed",
        description: err.message || "Failed to unlock. See console for details.",
        variant: "destructive",
      })
    }
  }

  // Format timestamp to date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Format amount
  const formatAmount = (amount: bigint) => {
    return ethers.formatUnits(amount, 18)
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Lock Data Explorer V3</h1>
      <p className="text-muted-foreground mb-6">
        Updated to handle array parameters for unlock and withdrawRewardLock functions
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Query User Locks</CardTitle>
          <CardDescription>
            Enter an address to query their lock data directly from the contract mappings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
            />
            <Button onClick={fetchUserData} disabled={loading || !address}>
              {loading ? "Fetching..." : "Query Locks"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {userInfo && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <h3 className="font-medium mb-2">User Info</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Amount:</p>
                  <p>{formatAmount(userInfo.amount)} OPUS</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Locked Amount:</p>
                  <p>{formatAmount(userInfo.locked)} OPUS</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Time:</p>
                  <p>{formatDate(Number(userInfo.startTime))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Claimed:</p>
                  <p>{formatAmount(userInfo.claimed)} OPUS</p>
                </div>
              </div>
            </div>
          )}

          {locks.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-medium">Found {locks.length} Active Locks:</h3>
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
                      <p className="text-sm">{Math.floor((lock.endTime - lock.startTime) / (24 * 60 * 60))} days</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">Reward Debt</p>
                      <p className="text-sm">{formatAmount(lock.rewardDebt)} OPUS</p>
                    </div>
                  </div>
                  <Button onClick={() => testUnlock(lock.id)} className="mt-2 w-full" variant="secondary">
                    Test Unlock (ID: {lock.id})
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-md text-center">
              <p className="text-sm text-muted-foreground">
                {loading ? "Fetching locks..." : "No locks found yet. Enter an address and click 'Query Locks'."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
          <CardDescription>Updated contract interaction details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Key updates in this version:</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>unlock() function now accepts an array of lock IDs</li>
              <li>withdrawRewardLock() function also accepts an array of lock IDs</li>
              <li>Improved lock scanning with consecutive empty lock detection</li>
              <li>Added test unlock functionality that properly passes lock ID as array</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-4">
              To implement in your code, ensure all unlock and withdrawRewardLock calls pass IDs as arrays, even for
              single locks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

