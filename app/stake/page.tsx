"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Info, Wallet, Lock, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useBlockchain } from "@/contexts/blockchain-context"
import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { RawInput } from "@/components/raw-input"
import { FormattedNumberInput } from "@/components/formatted-number-input"
import { toast } from "@/components/ui/use-toast"

// Add this near the top of the file, after the imports
declare global {
  interface Window {
    userLocks?: any[]
  }
}

export default function StakePage() {
  const {
    isConnected,
    balances,
    refreshBalances,
    isLoading: contextIsLoading,
    userLocks: initialUserLocks,
    stake: stakeTokens,
    unstake: unstakeTokens,
    lock: lockTokens,
    unlock: unlockTokens,
    claimRewards: claimTokenRewards,
    OPUS_TOKEN_ADDRESS,
    STAKING_CONTRACT_ADDRESS,
  } = useBlockchain()

  const [stakeAmount, setStakeAmount] = useState("")
  const [unstakeAmount, setUnstakeAmount] = useState("")
  const [lockAmount, setLockAmount] = useState("")
  const [lockPeriod, setLockPeriod] = useState("")
  const [customDays, setCustomDays] = useState("")
  const [selectedLock, setSelectedLock] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [userLocks, setUserLocks] = useState<any[]>(initialUserLocks || [])
  const [isLoading, setIsLoading] = useState(false)

  // Format numbers for display
  const formatBalance = (balance: string) => {
    const num = Number.parseFloat(balance)
    if (isNaN(num)) return "0"
    if (num === 0) return "0"
    if (num < 0.01) return "<0.01"
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }

  // Handle staking
  const handleStake = async () => {
    if (!stakeAmount || Number(stakeAmount) <= 0) return

    setIsSubmitting(true)
    setTxError(null)

    try {
      const success = await stakeTokens(stakeAmount)
      if (success) {
        setStakeAmount("")

        // More aggressive refresh strategy
        console.log("Staking successful, refreshing balances...")

        // Immediate refresh
        await refreshBalances()

        // Then multiple delayed refreshes to ensure we catch the updated state
        setTimeout(async () => {
          console.log("First delayed refresh after staking...")
          await refreshBalances()

          setTimeout(async () => {
            console.log("Second delayed refresh after staking...")
            await refreshBalances()
          }, 5000)
        }, 2000)
      }
    } catch (err: any) {
      console.error("Staking failed:", err)
      setTxError(err.message || "Transaction failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle unstaking
  const handleUnstake = async () => {
    if (!unstakeAmount || Number(unstakeAmount) <= 0) return

    setIsSubmitting(true)
    setTxError(null)

    const refreshWithRetries = async (attempts = 3, initialDelay = 2000) => {
      let currentDelay = initialDelay

      for (let i = 0; i < attempts; i++) {
        // Wait for the blockchain state to update
        await new Promise((resolve) => setTimeout(resolve, currentDelay))

        console.log(`Refresh attempt ${i + 1} after ${currentDelay}ms delay`)
        try {
          await refreshBalances()
        } catch (error) {
          console.error(`Error in refresh attempt ${i + 1}:`, error)
        }

        // Increase delay for next attempt
        currentDelay *= 1.5
      }
    }

    try {
      const success = await unstakeTokens(unstakeAmount)
      if (success) {
        setUnstakeAmount("")
        await refreshWithRetries()
      }
    } catch (err: any) {
      console.error("Unstaking failed:", err)
      setTxError(err.message || "Transaction failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle locking
  const handleLock = async () => {
    if (!lockAmount || Number(lockAmount) <= 0) return

    // Determine lock period in days
    let days = 0
    if (lockPeriod) {
      switch (lockPeriod) {
        case "tier5":
          days = 90
          break // 90 days (3 months)
        case "tier4":
          days = 180
          break // 6 months
        case "tier3":
          days = 365
          break // 1 year
        case "tier2":
          days = 730
          break // 2 years
        case "tier1":
          days = 1095
          break // 3 years
      }
    } else if (customDays) {
      days = Number(customDays)
      if (days < 90) {
        setTxError("Minimum lock period is 90 days")
        return
      }
    } else {
      setTxError("Please select a lock period")
      return
    }

    // Ensure days is at least 90
    if (days < 90) {
      setTxError("Minimum lock period is 90 days")
      return
    }

    setIsSubmitting(true)
    setTxError(null)

    try {
      console.log(`Attempting to lock ${lockAmount} OPUS for ${days} days`)
      const success = await lockTokens(lockAmount, days)
      if (success) {
        setLockAmount("")
        setLockPeriod("")
        setCustomDays("")
      }
    } catch (err: any) {
      console.error("Locking failed:", err)
      // Extract the reason from the error if available
      let errorMessage = "Transaction failed. Please try again."
      if (err.reason) {
        errorMessage = err.reason
      } else if (err.message && err.message.includes("min 90 day locking is required")) {
        errorMessage = "Minimum lock period is 90 days"
      } else if (err.message) {
        errorMessage = err.message
      }
      setTxError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle unlocking
  const handleUnlock = async () => {
    if (!selectedLock) {
      toast({
        title: "No lock selected",
        description: "Please select a lock to unlock",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    setTxError(null)

    try {
      console.log("Attempting to unlock lock with ID:", selectedLock)

      const success = await unlockTokens(selectedLock)

      if (success) {
        toast({
          title: "Unlock successful",
          description: "Your tokens have been unlocked successfully",
        })

        setSelectedLock("")

        // Refresh balances and locks after successful unlock
        setTimeout(async () => {
          await refreshBalances()
        }, 2000)
      }
    } catch (err: any) {
      console.error("Unlocking failed:", err)
      setTxError(err.message || "Transaction failed. Please try again.")

      toast({
        title: "Unlock failed",
        description: err.message || "Failed to unlock tokens. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle claiming rewards
  const handleClaimRewards = async () => {
    setIsSubmitting(true)
    setTxError(null)

    try {
      await claimTokenRewards()
    } catch (err: any) {
      console.error("Claiming rewards failed:", err)
      setTxError(err.message || "Transaction failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Set percentage of available balance for staking
  const setStakePercentage = (percentage: number) => {
    const availableBalance = Number.parseFloat(balances.wallet) - Number.parseFloat(balances.staked)
    const amount = availableBalance * (percentage / 100)
    setStakeAmount(amount.toString())
  }

  // Set percentage of staked balance for unstaking
  const setUnstakePercentage = (percentage: number) => {
    const amount = Number.parseFloat(balances.staked) * (percentage / 100)
    setUnstakeAmount(amount.toString())
  }

  // Set percentage of available staked balance for locking
  const setLockPercentage = (percentage: number) => {
    const availableStaked = Number.parseFloat(balances.staked) - Number.parseFloat(balances.locked)
    const amount = availableStaked * (percentage / 100)
    setLockAmount(amount.toString())
  }

  // Format timestamp to date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Get reward rate based on lock period
  const getRewardRate = (days: number) => {
    if (days >= 1095) return 100 // 3+ years (Tier 1)
    if (days >= 730) return 80 // 2-3 years (Tier 2)
    if (days >= 365) return 60 // 1-2 years (Tier 3)
    if (days >= 180) return 50 // 6-12 months (Tier 4)
    return 40 // 90 days-6 months (Tier 5)
  }

  // Refresh data on mount
  useEffect(() => {
    const initialRefresh = async () => {
      if (isConnected && !contextIsLoading) {
        console.log("Initial refresh of balances and locks from blockchain")
        try {
          // First refresh to get basic balances
          await refreshBalances()

          // Second refresh with a delay to ensure we get the latest state
          setTimeout(async () => {
            console.log("Secondary refresh to ensure locks are loaded from blockchain")
            await refreshBalances()
          }, 2000)
        } catch (error) {
          console.error("Error during initial refresh:", error)
        }
      }
    }

    initialRefresh()
  }, [isConnected, contextIsLoading]) // Only depend on isConnected to prevent refreshing on every render

  // Add this right after the useEffect hook that refreshes data on mount
  // Add a console log to check what locks are being received
  useEffect(() => {
    console.log("Current userLocks state:", userLocks)
    console.log("Initial locks from context:", initialUserLocks)
  }, [userLocks, initialUserLocks])

  // Add this right after the useEffect hook that refreshes data on mount
  // Add a debug button to the UI
  const injectMockData = () => {
    if (window.userLocks && window.userLocks.length > 0) {
      console.log("Using mock lock data:", window.userLocks)
      // This is just for debugging - in a real app you wouldn't do this
      setUserLocks(window.userLocks)
    } else {
      console.log("No mock lock data available")
    }
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tighter md:text-4xl text-foreground">
              Staking and Locking Opus Tokens
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshBalances()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Balances</span>
            </Button>
          </div>
          <p className="text-muted-foreground">
            Earn rewards in the form of reflections by staking your Opus tokens. You can also lock them for additional
            rewards.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Staking Portal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Staking Portal</CardTitle>
                <CardDescription>Stake your tokens to earn more reflections</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="stake" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="stake">Stake</TabsTrigger>
                    <TabsTrigger value="unstake">Unstake</TabsTrigger>
                  </TabsList>
                  <TabsContent value="stake" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                          Amount to Stake
                        </label>
                        <span className="text-sm text-muted-foreground">
                          Available:{" "}
                          {formatBalance(
                            (Number.parseFloat(balances.wallet) - Number.parseFloat(balances.staked)).toString(),
                          )}{" "}
                          OPUS
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <FormattedNumberInput
                          value={stakeAmount}
                          onChange={setStakeAmount}
                          placeholder="0.0"
                          disabled={isSubmitting}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setStakeAmount(
                              (Number.parseFloat(balances.wallet) - Number.parseFloat(balances.staked)).toString(),
                            )
                          }
                          disabled={isSubmitting}
                        >
                          MAX
                        </Button>
                      </div>
                      {/* Display total staked amount */}
                      <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                        <span>Currently staked:</span>
                        <span>{formatBalance(balances.staked)} OPUS</span>
                      </div>

                      {/* Percentage buttons for staking */}
                      <div className="grid grid-cols-4 gap-1 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setStakePercentage(25)}
                          disabled={isSubmitting}
                        >
                          25%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setStakePercentage(50)}
                          disabled={isSubmitting}
                        >
                          50%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setStakePercentage(75)}
                          disabled={isSubmitting}
                        >
                          75%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setStakePercentage(100)}
                          disabled={isSubmitting}
                        >
                          100%
                        </Button>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleStake}
                      disabled={!isConnected || isSubmitting || !stakeAmount || Number.parseFloat(stakeAmount) <= 0}
                    >
                      {!isConnected ? "Connect Wallet to Stake" : isSubmitting ? "Staking..." : "Stake"}
                    </Button>
                    {txError && <p className="text-red-500 text-xs">{txError}</p>}
                  </TabsContent>

                  <TabsContent value="unstake" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                          Amount to Unstake
                        </label>
                        <span className="text-sm text-muted-foreground">
                          Staked: {formatBalance(balances.staked)} OPUS
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <FormattedNumberInput
                          value={unstakeAmount}
                          onChange={setUnstakeAmount}
                          placeholder="0.0"
                          disabled={isSubmitting}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUnstakeAmount(balances.staked)}
                          disabled={isSubmitting}
                        >
                          MAX
                        </Button>
                      </div>

                      {/* Percentage buttons for unstaking */}
                      <div className="grid grid-cols-4 gap-1 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setUnstakePercentage(25)}
                          disabled={isSubmitting}
                        >
                          25%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setUnstakePercentage(50)}
                          disabled={isSubmitting}
                        >
                          50%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setUnstakePercentage(75)}
                          disabled={isSubmitting}
                        >
                          75%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setUnstakePercentage(100)}
                          disabled={isSubmitting}
                        >
                          100%
                        </Button>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleUnstake}
                      disabled={!isConnected || isSubmitting || !unstakeAmount || Number.parseFloat(unstakeAmount) <= 0}
                    >
                      {!isConnected ? "Connect Wallet to Unstake" : isSubmitting ? "Unstaking..." : "Unstake"}
                    </Button>
                    {txError && <p className="text-red-500 text-xs">{txError}</p>}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Locking Portal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Locking Portal</CardTitle>
                <CardDescription>Lock your tokens for 90+ days for additional rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="lock" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="lock">Lock</TabsTrigger>
                    <TabsTrigger value="unlock">Unlock</TabsTrigger>
                    <TabsTrigger value="claim">Claim Rewards</TabsTrigger>
                  </TabsList>
                  <TabsContent value="lock" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      {/* Amount to lock */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                            Amount to Lock
                          </label>
                          <span className="text-sm text-muted-foreground">
                            Available:{" "}
                            {formatBalance(
                              (Number.parseFloat(balances.staked) - Number.parseFloat(balances.locked)).toString(),
                            )}{" "}
                            OPUS
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <FormattedNumberInput
                            value={lockAmount}
                            onChange={setLockAmount}
                            placeholder="0.0"
                            disabled={isSubmitting}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setLockAmount(
                                (Number.parseFloat(balances.staked) - Number.parseFloat(balances.locked)).toString(),
                              )
                            }
                            disabled={isSubmitting}
                          >
                            MAX
                          </Button>
                        </div>

                        {/* Percentage buttons for locking */}
                        <div className="grid grid-cols-4 gap-1 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1"
                            onClick={() => setLockPercentage(25)}
                            disabled={isSubmitting}
                          >
                            25%
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1"
                            onClick={() => setLockPercentage(50)}
                            disabled={isSubmitting}
                          >
                            50%
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1"
                            onClick={() => setLockPercentage(75)}
                            disabled={isSubmitting}
                          >
                            75%
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1"
                            onClick={() => setLockPercentage(100)}
                            disabled={isSubmitting}
                          >
                            100%
                          </Button>
                        </div>
                      </div>

                      {/* Lock period selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                          Lock Period
                        </label>
                        <Select value={lockPeriod} onValueChange={setLockPeriod} disabled={isSubmitting}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lock period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tier5">90 days - 6 months (Tier 5, 40% reward)</SelectItem>
                            <SelectItem value="tier4">6 - 12 months (Tier 4, 50% reward)</SelectItem>
                            <SelectItem value="tier3">1 - 2 years (Tier 3, 60% reward)</SelectItem>
                            <SelectItem value="tier2">2 - 3 years (Tier 2, 80% reward)</SelectItem>
                            <SelectItem value="tier1">3+ years (Tier 1, 100% reward)</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Custom days input */}
                        <div className="flex items-center space-x-2 mt-2">
                          <RawInput
                            initialValue={customDays}
                            onValueChange={(value) => {
                              if (value === "" || /^\d+$/.test(value)) {
                                setCustomDays(value)
                              }
                            }}
                            placeholder="Or enter days (minimum 90)"
                            disabled={isSubmitting}
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">days</span>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <p className="text-sm text-blue-400">
                          <strong>Note:</strong> Tokens will be locked for a minimum of 90 days. Longer lock periods
                          earn higher rewards.
                        </p>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleLock}
                        disabled={
                          !isConnected ||
                          isSubmitting ||
                          !lockAmount ||
                          Number.parseFloat(lockAmount) <= 0 ||
                          (!lockPeriod && !customDays)
                        }
                      >
                        {!isConnected ? "Connect Wallet to Lock" : isSubmitting ? "Locking..." : "Lock"}
                      </Button>
                      {txError && <p className="text-red-500 text-xs">{txError}</p>}
                    </div>

                    {/* Current locks section */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">Your Current Locks</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={async () => {
                            console.log("Forcing direct blockchain refresh for locks...")
                            try {
                              setIsLoading(true)
                              await refreshBalances()

                              toast({
                                title: "Locks Refreshed",
                                description: `Found ${userLocks.length} active locks from blockchain.`,
                              })
                            } catch (err) {
                              console.error("Error refreshing locks from blockchain:", err)
                              toast({
                                title: "Refresh Failed",
                                description: "Failed to refresh locks from blockchain. Please try again.",
                                variant: "destructive",
                              })
                            } finally {
                              setIsLoading(false)
                            }
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Refresh Blockchain Locks
                        </Button>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Amount</TableHead>
                              <TableHead>Reward</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                  <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-neon-green"></div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : userLocks && userLocks.length > 0 ? (
                              userLocks
                                .map((lock, index) => {
                                  try {
                                    // Safely extract values with fallbacks
                                    let amount = "0"
                                    try {
                                      amount = lock.amount ? ethers.formatUnits(lock.amount, 18) : "0"
                                    } catch (e) {
                                      console.warn("Error formatting amount:", e)
                                      // Try as string if BigInt conversion failed
                                      amount = lock.amount ? lock.amount.toString() : "0"
                                    }

                                    // Handle different timestamp formats
                                    let startTime = Date.now() / 1000 - 86400 // Default to 1 day ago
                                    let endTime = Date.now() / 1000 + 86400 * 90 // Default to 90 days from now
                                    let lockPeriod = 90 // Default to 90 days

                                    if (lock.startTime) {
                                      startTime = Number(lock.startTime)
                                    } else if (lock.start) {
                                      startTime = Number(lock.start)
                                    }

                                    if (lock.endTime) {
                                      endTime = Number(lock.endTime)
                                    } else if (lock.end) {
                                      endTime = Number(lock.end)
                                    }

                                    if (lock.lockPeriod) {
                                      lockPeriod = Number(lock.lockPeriod)
                                    } else if (lock.period) {
                                      lockPeriod = Number(lock.period)
                                    } else {
                                      // Calculate period from timestamps if not available
                                      lockPeriod = Math.floor((endTime - startTime) / (24 * 60 * 60))
                                    }

                                    // Skip rendering if amount is 0
                                    if (Number(amount) <= 0) {
                                      console.log("Skipping lock with zero amount:", lock)
                                      return null
                                    }

                                    // Ensure we have a valid lock period
                                    if (lockPeriod < 1) lockPeriod = 90 // Default to 90 days

                                    console.log("Rendering lock from blockchain:", {
                                      id: lock.id,
                                      amount,
                                      startTime: new Date(startTime * 1000).toLocaleString(),
                                      endTime: new Date(endTime * 1000).toLocaleString(),
                                      lockPeriod,
                                    })

                                    return (
                                      <TableRow key={index}>
                                        <TableCell className="font-medium">{formatBalance(amount)} OPUS</TableCell>
                                        <TableCell>
                                          {getRewardRate(lockPeriod)}% (Period: {lockPeriod} days)
                                        </TableCell>
                                        <TableCell>{formatDate(startTime)}</TableCell>
                                        <TableCell>{formatDate(endTime)}</TableCell>
                                      </TableRow>
                                    )
                                  } catch (error) {
                                    console.error("Error rendering lock row:", error, lock)
                                    return null
                                  }
                                })
                                .filter(Boolean) // Filter out null rows
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                                  You don't have any active locks on the blockchain
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          You can create multiple locks with different amounts and periods.
                        </p>
                        {userLocks && userLocks.length > 0 && (
                          <p className="text-xs text-neon-green">
                            {userLocks.length} active lock{userLocks.length !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="unlock" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                          Select Lock to Unlock
                        </label>
                        <Select value={selectedLock} onValueChange={setSelectedLock} disabled={isSubmitting}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a lock to unlock" />
                          </SelectTrigger>
                          <SelectContent>
                            {userLocks && userLocks.length > 0 ? (
                              userLocks
                                .map((lock, index) => {
                                  // Skip locks with zero amount
                                  let amount
                                  try {
                                    amount = lock.amount ? ethers.formatUnits(lock.amount, 18) : "0"
                                    if (Number(amount) <= 0) return null

                                    // Get end date with fallback
                                    const endTime = lock.endTime || lock.end || 0
                                    const endDate = formatDate(Number(endTime))

                                    return (
                                      <SelectItem key={index} value={lock.id.toString()}>
                                        {formatBalance(amount)} OPUS (ends {endDate})
                                      </SelectItem>
                                    )
                                  } catch (error) {
                                    console.error("Error processing lock for dropdown:", error, lock)
                                    return null
                                  }
                                })
                                .filter(Boolean) // Filter out null items
                            ) : (
                              <SelectItem value="none" disabled>
                                No locks available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={async () => {
                            try {
                              await refreshBalances()
                              toast({
                                title: "Locks Refreshed",
                                description: `Found ${userLocks.length} active locks.`,
                              })
                            } catch (err) {
                              console.error("Error refreshing locks:", err)
                              toast({
                                title: "Refresh Failed",
                                description: "Failed to refresh locks. Please try again.",
                                variant: "destructive",
                              })
                            }
                          }}
                          disabled={isLoading || isSubmitting}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh Locks
                        </Button>
                      </div>

                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                        <p className="text-sm text-red-400">
                          <strong>Warning:</strong> Unlocking before your lock period ends will incur a 30% penalty. The
                          penalty amount will be distributed to current lockers.
                        </p>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleUnlock}
                        disabled={!isConnected || isSubmitting || !selectedLock || userLocks.length === 0}
                      >
                        {!isConnected ? "Connect Wallet to Unlock" : isSubmitting ? "Unlocking..." : "Unlock"}
                      </Button>
                      {txError && <p className="text-red-500 text-xs">{txError}</p>}
                    </div>
                  </TabsContent>

                  {/* Claim Rewards Tab */}
                  <TabsContent value="claim" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      <div className="p-4 bg-neon-green/5 border border-neon-green/20 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-foreground">Total Available Rewards</span>
                          <span className="text-xl font-bold text-neon-green">
                            {formatBalance(balances.rewards)} OPUS
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Rewards are calculated based on your lock amount, duration, and tier.
                        </p>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Lock Amount</TableHead>
                              <TableHead>Lock Period</TableHead>
                              <TableHead>Reward Rate</TableHead>
                              <TableHead>Available Rewards</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userLocks.length > 0 ? (
                              userLocks.map((lock, index) => {
                                try {
                                  // Get lock period with fallbacks
                                  const lockPeriod =
                                    lock.lockPeriod ||
                                    lock.period ||
                                    Math.floor(
                                      ((lock.endTime || lock.end) - (lock.startTime || lock.start)) / (24 * 60 * 60),
                                    ) ||
                                    90

                                  // Calculate rewards for this lock (simplified)
                                  const lockReward = Number(ethers.formatUnits(lock.amount, 18)) * 0.05

                                  return (
                                    <TableRow key={index}>
                                      <TableCell>{formatBalance(ethers.formatUnits(lock.amount, 18))} OPUS</TableCell>
                                      <TableCell>{lockPeriod} days</TableCell>
                                      <TableCell>{getRewardRate(lockPeriod)}%</TableCell>
                                      <TableCell className="font-medium text-neon-green">
                                        {formatBalance(lockReward.toString())} OPUS
                                      </TableCell>
                                    </TableRow>
                                  )
                                } catch (error) {
                                  console.error("Error rendering lock in rewards tab:", error, lock)
                                  return null
                                }
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                                  You don't have any active locks
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">Claim Options</label>
                          <span className="text-xs text-muted-foreground">Last claimed: Never</span>
                        </div>
                        <Select defaultValue="all" disabled={isSubmitting}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              Claim All Rewards ({formatBalance(balances.rewards)} OPUS)
                            </SelectItem>
                            {userLocks.map((lock, index) => {
                              // Calculate rewards for this lock (simplified)
                              const lockReward = Number(ethers.formatUnits(lock.amount, 18)) * 0.05

                              return (
                                <SelectItem key={index} value={lock.id.toString()}>
                                  Claim from {formatBalance(ethers.formatUnits(lock.amount, 18))} OPUS lock only (
                                  {formatBalance(lockReward.toString())} OPUS)
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <p className="text-sm text-blue-400">
                          <strong>Note:</strong> Claiming rewards does not affect your lock period or amount. You can
                          claim rewards at any time.
                        </p>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleClaimRewards}
                        disabled={!isConnected || isSubmitting || Number.parseFloat(balances.rewards) <= 0}
                      >
                        {!isConnected
                          ? "Connect Wallet to Claim Rewards"
                          : isSubmitting
                            ? "Claiming..."
                            : "Claim Rewards"}
                      </Button>
                      {txError && <p className="text-red-500 text-xs">{txError}</p>}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Your Earnings */}
            <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <Info className="mr-2 h-5 w-5" />
                  Your Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-neon-green/10">
                    <span className="text-sm text-foreground">Opus earned from holding</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatBalance(balances.holdingRewards)} OPUS
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-neon-green/10">
                    <span className="text-sm text-foreground">Opus earned from staking</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatBalance(balances.stakingRewards)} OPUS
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground">Opus earned from locking</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatBalance(balances.lockingRewards)} OPUS
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Staked Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-foreground">
                  <div className="flex items-center">
                    <Wallet className="mr-2 h-5 w-5" />
                    Staked
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshBalances()}
                    disabled={isLoading}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    <span className="sr-only">Refresh</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground">Total Staked</span>
                    <span className="text-sm font-medium text-foreground">
                      {isLoading ? (
                        <span className="inline-block w-16 h-4 bg-muted/20 animate-pulse rounded"></span>
                      ) : (
                        <span className="text-neon-green font-bold">{formatBalance(balances.staked)} OPUS</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground">Available Rewards</span>
                    <span className="text-sm font-medium text-foreground">{formatBalance(balances.rewards)} OPUS</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClaimRewards}
                  disabled={!isConnected || isSubmitting || Number.parseFloat(balances.rewards) <= 0}
                >
                  {isSubmitting ? "Claiming..." : "Claim Rewards"}
                </Button>
                {txError && <p className="text-red-500 text-xs">{txError}</p>}
              </CardContent>
            </Card>

            {/* Increased spacer height to lower the Locked card more */}
            <div className="h-[125px]"></div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <Lock className="mr-2 h-5 w-5" />
                  Locked
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground">Total Locked</span>
                    <span className="text-sm font-medium text-foreground">{formatBalance(balances.locked)} OPUS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground">Active Locks</span>
                    <span className="text-sm font-medium text-foreground">{userLocks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground">Available Rewards</span>
                    <span className="text-sm font-medium text-foreground">{formatBalance(balances.rewards)} OPUS</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Is there a minimum lock-up period for staking?</h3>
                <p className="text-sm text-muted-foreground">No, there is no minimum lock-up period.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Is there a minimum lock-up period for locking tokens?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, there is a 90 day minimum lock-up period. If the user ends their locking period before 90 days
                  has passed, they incur a 30% penalty, and the distribution goes to current lockers.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">
                  Is there a withdrawal fee for ending a stake and withdrawing the tokens to your wallet?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Yes. There is a 1% withdrawal fee for ending a stake with the withdrawal function. This fee is
                  distributed to stakers.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Can I have multiple locks with different periods?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can create multiple locks with different amounts and lock periods to diversify your locking
                  strategy. Each lock will earn rewards based on its specific tier and duration.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">How often can I claim rewards from locking?</h3>
                <p className="text-sm text-muted-foreground">
                  You can claim rewards from your locked tokens at any time. Claiming rewards does not affect your lock
                  period or amount.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        // Add this to the debug section at the bottom of the page
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Debug Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Contract Addresses</h3>
                <p className="text-sm text-muted-foreground break-all">
                  Token: {OPUS_TOKEN_ADDRESS}
                  <br />
                  Staking: {STAKING_CONTRACT_ADDRESS}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Debugging Tools</h3>
                <div className="flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/stake/debug/contract-inspector")}
                    className="w-full"
                  >
                    Open Contract Inspector
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/stake/blockchain-query")}
                    className="w-full"
                  >
                    Open Blockchain Query Tool
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Raw Balance Data</h3>
                <p className="text-sm text-muted-foreground">
                  Wallet: {balances.wallet}
                  <br />
                  Staked: {balances.staked}
                  <br />
                  Locked: {balances.locked}
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={async () => {
                    try {
                      await refreshBalances()
                      toast({
                        title: "Refresh Complete",
                        description: "Balance data has been refreshed from the blockchain.",
                      })
                    } catch (err) {
                      console.error("Manual refresh error:", err)
                      toast({
                        title: "Refresh Failed",
                        description: "There was an error refreshing the balance data.",
                        variant: "destructive",
                      })
                    }
                  }}
                  className="w-full"
                >
                  Force Refresh Balances
                </Button>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Lock Data</h3>
                <p className="text-sm text-muted-foreground">Active Locks: {userLocks.length}</p>
                <Button
                  onClick={async () => {
                    try {
                      // Force refresh balances to update locks
                      await refreshBalances()

                      // Log current locks for debugging
                      console.log("Current locks:", userLocks)

                      toast({
                        title: "Locks Refreshed",
                        description: `Found ${userLocks.length} active locks.`,
                      })
                    } catch (err) {
                      console.error("Error refreshing locks:", err)
                      toast({
                        title: "Refresh Failed",
                        description: "There was an error refreshing your locks.",
                        variant: "destructive",
                      })
                    }
                  }}
                  className="w-full"
                >
                  Force Refresh Locks
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

