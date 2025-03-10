"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ethers } from "ethers"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useToast } from "@/components/ui/use-toast"

export function DebugPanel() {
  const [address, setAddress] = useState("")
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [method, setMethod] = useState("getStakedBalance")
  const { toast } = useToast()

  const checkBalance = async () => {
    if (!ethers.isAddress(address)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      let balance
      try {
        if (method === "mapUserInfo") {
          balance = await stakingContract[method](address)
          console.log(`${method} result:`, balance)

          // Format the struct result
          const formattedResult = {
            amount: ethers.formatUnits(balance.amount, 18),
            rewardDebt: ethers.formatUnits(balance.rewardDebt, 18),
            startTime: balance.startTime.toString(),
            claimed: ethers.formatUnits(balance.claimed, 18),
            lockClaimed: ethers.formatUnits(balance.lockClaimed, 18),
            locked: ethers.formatUnits(balance.locked, 18),
            pendingToClaimed: ethers.formatUnits(balance.pendingToClaimed, 18),
            stakedBalance: ethers.formatUnits(balance.amount - balance.locked, 18),
          }

          setResult(formattedResult)
        } else {
          // Original code for other methods
          balance = await stakingContract[method](address)
          console.log(`${method} result:`, balance)

          // Format the result based on its type
          if (typeof balance === "object" && balance.length !== undefined) {
            // It's an array-like object
            const formattedResult = []
            for (let i = 0; i < balance.length; i++) {
              formattedResult.push(ethers.formatUnits(balance[i], 18))
            }
            setResult(formattedResult)
          } else {
            // It's a single value
            setResult(ethers.formatUnits(balance, 18))
          }
        }
      } catch (error) {
        console.error(`Error calling ${method}:`, error)
        toast({
          title: `${method} Failed`,
          description: `Error: ${error.message}`,
          variant: "destructive",
        })
        setResult(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error("Error in debug check:", error)
      toast({
        title: "Check Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      })
      setResult(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staking Contract Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Contract Address</label>
          <div className="text-xs text-muted-foreground break-all">{STAKING_CONTRACT_ADDRESS}</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Method to Call</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
          >
            <option value="getStakedBalance">getStakedBalance</option>
            <option value="stakedBalanceOf">stakedBalanceOf</option>
            <option value="balanceOf">balanceOf</option>
            <option value="getUserInfo">getUserInfo</option>
            <option value="userInfo">userInfo</option>
            <option value="mapUserInfo">mapUserInfo</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Wallet Address</label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address to check"
          />
        </div>

        <Button onClick={checkBalance} disabled={isLoading} className="w-full">
          {isLoading ? "Checking..." : "Check Staked Balance"}
        </Button>

        {result !== null && (
          <div className="p-3 bg-background/30 rounded-md">
            <h3 className="text-sm font-medium mb-1">Result:</h3>
            <div className="text-xs break-all">
              {typeof result === "object" ? JSON.stringify(result, null, 2) : result.toString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

