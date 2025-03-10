"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"
import { toast } from "@/components/ui/use-toast"

export default function LockScannerPage() {
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [locks, setLocks] = useState<any[]>([])
  const [scanProgress, setScanProgress] = useState(0)
  const { account } = useBlockchain()

  // Auto-fill connected wallet address
  useEffect(() => {
    if (account) {
      setAddress(account)
    }
  }, [account])

  // Function to scan for locks using brute force approach
  const scanForLocks = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)
    setLocks([])
    setScanProgress(0)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Get user info first to check if they have any locked tokens
      const info = await contract.mapUserInfo(address)
      setUserInfo({
        amount: info.amount.toString(),
        locked: info.locked.toString(),
        startTime: Number(info.startTime),
        claimed: info.claimed.toString(),
      })

      if (info.locked.toString() === "0") {
        toast({
          title: "No Locked Tokens",
          description: "This address doesn't have any locked tokens according to mapUserInfo",
        })
        setLoading(false)
        return
      }

      console.log("User has locked tokens:", ethers.formatUnits(info.locked, 18))

      // Scan for locks by checking mapUserInfoLock for each potential ID
      const foundLocks = []
      const MAX_ID_TO_CHECK = 1000 // Limit how many IDs we check
      let consecutiveEmptyLocks = 0
      const MAX_CONSECUTIVE_EMPTY = 20 // Stop after this many consecutive empty locks

      for (let i = 0; i < MAX_ID_TO_CHECK && consecutiveEmptyLocks < MAX_CONSECUTIVE_EMPTY; i++) {
        try {
          setScanProgress(Math.floor((i / MAX_ID_TO_CHECK) * 100))

          const lockInfo = await contract.mapUserInfoLock(address, i)

          // If the lock has a non-zero amount, it's a valid lock
          if (lockInfo && lockInfo.amount.toString() !== "0") {
            console.log(`Found lock at ID ${i}:`, lockInfo)
            foundLocks.push({
              id: i,
              amount: lockInfo.amount.toString(),
              startTime: Number(lockInfo.startTime),
              endTime: Number(lockInfo.endTime),
              rewardDebt: lockInfo.rewardDebt.toString(),
            })
            consecutiveEmptyLocks = 0 // Reset counter when we find a lock
          } else {
            consecutiveEmptyLocks++
          }
        } catch (err) {
          // Ignore errors - likely means no lock at this ID
          consecutiveEmptyLocks++
        }

        // Update progress every 10 IDs
        if (i % 10 === 0) {
          toast({
            title: "Scanning Progress",
            description: `Checked ${i} potential lock IDs...`,
          })
        }
      }

      setLocks(foundLocks)
      setScanProgress(100)

      toast({
        title: "Lock Scan Complete",
        description: `Found ${foundLocks.length} locks for this address`,
      })
    } catch (err: any) {
      console.error("Error scanning for locks:", err)
      setError(err.message || "Failed to scan for locks")

      toast({
        title: "Error",
        description: "Failed to scan for locks. See console for details.",
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
      await scanForLocks()
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

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Lock Scanner</h1>
      <p className="text-muted-foreground mb-6">Brute force scanner to find all locks for an address</p>

      <Card>
        <CardHeader>
          <CardTitle>Scan for Locks</CardTitle>
          <CardDescription>This tool will scan for locks by checking each potential lock ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
            />
            <Button onClick={scanForLocks} disabled={loading || !address}>
              {loading ? "Scanning..." : "Scan for Locks"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${scanProgress}%` }}></div>
              </div>
              <p className="text-sm text-center text-muted-foreground">Scanning... {scanProgress}% complete</p>
            </div>
          )}

          {userInfo && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
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
                      <p className="text-sm">{ethers.formatUnits(lock.amount, 18)} OPUS</p>
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
                      <p className="text-sm">{ethers.formatUnits(lock.rewardDebt, 18)} OPUS</p>
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
                {loading ? "Scanning for locks..." : "No locks found yet. Click 'Scan for Locks' to begin."}
              </p>
            </div>
          )}

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="text-sm text-blue-500">
              <strong>How this works:</strong> This tool scans through potential lock IDs (0-1000) and checks if there's
              a lock at each ID. It will find all active locks for the address, even if they're not sequential.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

