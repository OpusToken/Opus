"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useBlockchain } from "@/contexts/blockchain-context"
import { toast } from "@/components/ui/use-toast"

export default function LockFixV4Page() {
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [locks, setLocks] = useState<any[]>([])
  const [selectedLocks, setSelectedLocks] = useState<number[]>([])
  const { account } = useBlockchain()

  // Auto-fill connected wallet address
  useEffect(() => {
    if (account) {
      setAddress(account)
    }
  }, [account])

  // Get user info
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

      // If user has locked tokens, scan for locks
      if (info.locked.toString() !== "0") {
        scanForLocks()
      }
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

  // Scan for locks
  const scanForLocks = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setScanning(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Scan for locks by checking mapUserInfoLock for each potential ID
      const foundLocks = []
      const MAX_ID_TO_CHECK = 100 // Limit how many IDs we check

      for (let i = 0; i < MAX_ID_TO_CHECK; i++) {
        try {
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

      setLocks(foundLocks)

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
      setScanning(false)
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

    if (selectedLocks.length === 0) {
      toast({
        title: "No Locks Selected",
        description: "Please select at least one lock to unlock",
        variant: "destructive",
      })
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

      console.log("Unlocking locks with IDs:", selectedLocks)

      // Call unlock with an array of lock IDs
      const tx = await contract.unlock(selectedLocks)

      toast({
        title: "Transaction Sent",
        description: "Unlock transaction has been sent to the network",
      })

      await tx.wait()

      toast({
        title: "Unlock Successful",
        description: `Successfully unlocked ${selectedLocks.length} locks`,
      })

      // Refresh data
      await getUserInfo()
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
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Toggle lock selection
  const toggleLockSelection = (id: number) => {
    if (selectedLocks.includes(id)) {
      setSelectedLocks(selectedLocks.filter((lockId) => lockId !== id))
    } else {
      setSelectedLocks([...selectedLocks, id])
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Lock Fix V4</h1>
      <p className="text-muted-foreground mb-6">Find and unlock your locks with the correct array parameter</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Wallet Address</CardTitle>
          <CardDescription>Enter the wallet address to check for locks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
            />
            <Button onClick={getUserInfo} disabled={loading || !address}>
              {loading ? "Loading..." : "Check Locks"}
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

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md mt-4">
              <p className="text-sm text-blue-500">
                <strong>Note:</strong> The user has {ethers.formatUnits(userInfo.locked, 18)} OPUS locked in the
                contract.
                {userInfo.locked === "0" ? " No locks to find." : " Scanning for individual locks..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {locks.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Found Locks</CardTitle>
            <CardDescription>Select locks to unlock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locks.map((lock) => (
                <div
                  key={lock.id}
                  className={`p-4 rounded-md border cursor-pointer ${
                    selectedLocks.includes(lock.id) ? "bg-green-500/10 border-green-500/20" : "bg-muted border-border"
                  }`}
                  onClick={() => toggleLockSelection(lock.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Lock ID: {lock.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Amount: {ethers.formatUnits(lock.amount, 18)} OPUS
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Period: {Math.floor((lock.endTime - lock.startTime) / (24 * 60 * 60))} days
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Start: {formatDate(lock.startTime)} | End: {formatDate(lock.endTime)}
                      </p>
                    </div>
                    <div>
                      <input
                        type="checkbox"
                        checked={selectedLocks.includes(lock.id)}
                        onChange={() => toggleLockSelection(lock.id)}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center">
                <p className="text-sm">{selectedLocks.length} lock(s) selected</p>
                <Button onClick={testUnlock} disabled={selectedLocks.length === 0 || !account}>
                  Unlock Selected Locks
                </Button>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="text-sm text-blue-500">
                  <strong>Important:</strong> The unlock function requires an array of lock IDs. This tool correctly
                  passes the selected lock IDs as an array.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {scanning && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Scanning for Locks</CardTitle>
            <CardDescription>Please wait while we scan for locks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How This Works</CardTitle>
          <CardDescription>Understanding the lock system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Based on our analysis of the contract code:</p>

            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>The token contract tracks the total amount locked for each user in a simple mapping.</li>
              <li>
                The staking contract stores individual locks in a mapping called <code>mapUserInfoLock</code>.
              </li>
              <li>Each lock has an ID, amount, start time, end time, and reward debt.</li>
              <li>
                The <code>unlock</code> function expects an array of lock IDs, not a single ID.
              </li>
              <li>
                This tool scans for all your locks and allows you to unlock them with the correct parameter format.
              </li>
            </ol>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-sm text-blue-500">
                <strong>Key Insight:</strong> The previous unlock attempts may have failed because the lock IDs weren't
                passed as an array. This tool correctly formats the parameters for the unlock function.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

