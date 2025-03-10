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

export default function ContractDiagnosticPage() {
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contractFunctions, setContractFunctions] = useState<string[]>([])
  const [abiJson, setAbiJson] = useState("")
  const [functionResults, setFunctionResults] = useState<{ [key: string]: any }>({})
  const [selectedFunction, setSelectedFunction] = useState("")
  const [functionParams, setFunctionParams] = useState("")
  const { account } = useBlockchain()

  // Auto-fill connected wallet address
  useEffect(() => {
    if (account) {
      setAddress(account)
    }
  }, [account])

  // Initialize ABI display
  useEffect(() => {
    try {
      setAbiJson(JSON.stringify(STAKING_CONTRACT_ABI, null, 2))

      // Extract function names from ABI
      const functions = STAKING_CONTRACT_ABI.filter((item: any) => item.type === "function").map((item: any) => {
        const inputs = item.inputs?.map((input: any) => `${input.type} ${input.name || ""}`).join(", ") || ""
        return `${item.name}(${inputs})`
      })

      setContractFunctions(functions)
    } catch (err) {
      console.error("Error parsing ABI:", err)
      setError("Error parsing ABI. Check console for details.")
    }
  }, [])

  // Function to call a contract function
  const callContractFunction = async () => {
    if (!selectedFunction) {
      toast({
        title: "Error",
        description: "Please select a function to call",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Extract function name
      const functionName = selectedFunction.split("(")[0]

      // Parse parameters
      let params: any[] = []
      if (address) {
        params.push(address)
      }

      if (functionParams) {
        try {
          // Try to parse as JSON array
          const additionalParams = JSON.parse(`[${functionParams}]`)
          params = [...params, ...additionalParams]
        } catch (e) {
          // If not valid JSON, split by comma
          const additionalParams = functionParams.split(",").map((p) => p.trim())
          params = [...params, ...additionalParams]
        }
      }

      console.log(`Calling ${functionName} with params:`, params)

      // Call the function
      const result = await contract[functionName](...params)
      console.log(`Result from ${functionName}:`, result)

      // Process result for display
      let processedResult
      if (Array.isArray(result)) {
        processedResult = result.map((item) => (typeof item === "bigint" ? item.toString() : item))
      } else if (typeof result === "object") {
        processedResult = {}
        for (const [key, value] of Object.entries(result)) {
          processedResult[key] = typeof value === "bigint" ? value.toString() : value
        }
      } else {
        processedResult = typeof result === "bigint" ? result.toString() : result
      }

      // Update results
      setFunctionResults({
        ...functionResults,
        [functionName]: {
          params,
          result: processedResult,
        },
      })

      toast({
        title: "Function Called Successfully",
        description: `${functionName} returned a result. See details below.`,
      })
    } catch (err: any) {
      console.error("Error calling function:", err)
      setError(err.message || "An error occurred while calling the function")

      toast({
        title: "Error",
        description: "Failed to call function. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to check if getUserLockIds and getLockInfo exist
  const checkCriticalFunctions = async () => {
    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      const criticalFunctions = ["getUserLockIds", "getLockInfo", "getUserLocks", "mapUserInfoLock"]

      const results = {}

      for (const funcName of criticalFunctions) {
        try {
          if (typeof contract[funcName] === "function") {
            results[funcName] = "Function exists"

            // Try to call the function if address is provided
            if (address) {
              if (funcName === "getUserLockIds") {
                const lockIds = await contract.getUserLockIds(address)
                results[`${funcName}_result`] = lockIds.map((id) => id.toString())

                // If we got lock IDs, try to get info for the first one
                if (lockIds.length > 0) {
                  try {
                    const lockInfo = await contract.getLockInfo(lockIds[0])
                    results["getLockInfo_result"] = {
                      id: lockIds[0].toString(),
                      ...Object.fromEntries(
                        Object.entries(lockInfo).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]),
                      ),
                    }
                  } catch (e) {
                    results["getLockInfo_error"] = e.message
                  }
                }
              }
            }
          } else {
            results[funcName] = "Function does not exist"
          }
        } catch (e) {
          results[funcName] = `Error: ${e.message}`
        }
      }

      setFunctionResults({
        ...functionResults,
        criticalFunctions: results,
      })

      toast({
        title: "Critical Functions Checked",
        description: "Check results below for details on critical functions.",
      })
    } catch (err: any) {
      console.error("Error checking critical functions:", err)
      setError(err.message || "An error occurred while checking critical functions")
    } finally {
      setLoading(false)
    }
  }

  // Function to check contract state
  const checkContractState = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Try to get user info
      let userInfo
      try {
        userInfo = await contract.mapUserInfo(address)
      } catch (e) {
        console.error("Error getting user info:", e)
      }

      // Try to get lock IDs
      let lockIds
      try {
        lockIds = await contract.getUserLockIds(address)
      } catch (e) {
        console.error("Error getting lock IDs:", e)
      }

      // Try direct call to get mapUserInfoLock
      const lockData = []
      if (lockIds && lockIds.length > 0) {
        for (const id of lockIds) {
          try {
            // Try to call mapUserInfoLock directly if it exists
            if (typeof contract.mapUserInfoLock === "function") {
              const lock = await contract.mapUserInfoLock(address, id)
              lockData.push({
                id: id.toString(),
                ...Object.fromEntries(
                  Object.entries(lock).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]),
                ),
              })
            } else {
              // Try getLockInfo as fallback
              const lock = await contract.getLockInfo(id)
              lockData.push({
                id: id.toString(),
                ...Object.fromEntries(
                  Object.entries(lock).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]),
                ),
              })
            }
          } catch (e) {
            console.error(`Error getting lock data for ID ${id}:`, e)
          }
        }
      }

      setFunctionResults({
        ...functionResults,
        contractState: {
          userInfo: userInfo
            ? Object.fromEntries(
                Object.entries(userInfo).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]),
              )
            : "Not available",
          lockIds: lockIds ? lockIds.map((id) => id.toString()) : "Not available",
          lockData,
        },
      })

      toast({
        title: "Contract State Checked",
        description: "Check results below for details on contract state.",
      })
    } catch (err: any) {
      console.error("Error checking contract state:", err)
      setError(err.message || "An error occurred while checking contract state")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Contract Diagnostic Tool</h1>
      <p className="text-muted-foreground mb-6">
        This tool helps diagnose issues with the staking contract by examining its functions and state.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Wallet Address</CardTitle>
          <CardDescription>Enter the wallet address to use for function calls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button onClick={checkCriticalFunctions} disabled={loading}>
              Check Critical Functions
            </Button>
            <Button onClick={checkContractState} disabled={loading || !address}>
              Check Contract State
            </Button>
            <Button variant="outline" onClick={() => setAddress(account || "")} disabled={!account}>
              Use Connected Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="critical" className="w-full mb-6">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="critical">Critical Functions</TabsTrigger>
          <TabsTrigger value="state">Contract State</TabsTrigger>
          <TabsTrigger value="functions">All Functions</TabsTrigger>
          <TabsTrigger value="abi">Contract ABI</TabsTrigger>
        </TabsList>

        <TabsContent value="critical">
          <Card>
            <CardHeader>
              <CardTitle>Critical Functions Check</CardTitle>
              <CardDescription>Check if critical functions exist and work</CardDescription>
            </CardHeader>
            <CardContent>
              {functionResults.criticalFunctions ? (
                <div className="space-y-4">
                  {Object.entries(functionResults.criticalFunctions).map(([key, value]) => (
                    <div key={key} className="p-2 bg-muted rounded-md">
                      <p className="text-sm font-medium">{key}</p>
                      <pre className="text-xs mt-1 overflow-auto">
                        {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Click "Check Critical Functions" to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="state">
          <Card>
            <CardHeader>
              <CardTitle>Contract State</CardTitle>
              <CardDescription>Check the current state of the contract for this address</CardDescription>
            </CardHeader>
            <CardContent>
              {functionResults.contractState ? (
                <div className="space-y-4">
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">User Info</p>
                    <pre className="text-xs mt-1 overflow-auto">
                      {JSON.stringify(functionResults.contractState.userInfo, null, 2)}
                    </pre>
                  </div>

                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">Lock IDs</p>
                    <pre className="text-xs mt-1 overflow-auto">
                      {JSON.stringify(functionResults.contractState.lockIds, null, 2)}
                    </pre>
                  </div>

                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">Lock Data</p>
                    <pre className="text-xs mt-1 overflow-auto">
                      {JSON.stringify(functionResults.contractState.lockData, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Click "Check Contract State" to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <CardTitle>Contract Functions</CardTitle>
              <CardDescription>Call specific functions on the contract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Function</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedFunction}
                  onChange={(e) => setSelectedFunction(e.target.value)}
                >
                  <option value="">Select a function...</option>
                  {contractFunctions.map((func, index) => (
                    <option key={index} value={func}>
                      {func}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Parameters (optional)</label>
                <Input
                  value={functionParams}
                  onChange={(e) => setFunctionParams(e.target.value)}
                  placeholder="e.g., true, 123 (comma separated)"
                />
                <p className="text-xs text-muted-foreground">
                  Address is automatically included as first parameter if provided.
                </p>
              </div>

              <Button onClick={callContractFunction} disabled={loading || !selectedFunction} className="w-full">
                {loading ? "Calling..." : "Call Function"}
              </Button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <div className="space-y-4 mt-4">
                <h3 className="text-md font-medium">Function Results:</h3>

                {Object.entries(functionResults)
                  .filter(([key]) => key !== "criticalFunctions" && key !== "contractState")
                  .map(([funcName, data]) => (
                    <div key={funcName} className="p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium">{funcName}</p>
                      <p className="text-xs text-muted-foreground mt-1">Parameters: {JSON.stringify(data.params)}</p>
                      <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(data.result, null, 2)}</pre>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abi">
          <Card>
            <CardHeader>
              <CardTitle>Contract ABI</CardTitle>
              <CardDescription>View the current ABI being used</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-4 overflow-auto max-h-[500px]">
                <pre className="text-xs">{abiJson}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Information</CardTitle>
          <CardDescription>Information to help diagnose contract issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Based on the contract code snippets you provided, we know:</p>

          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>
              The contract stores locks in a mapping called <code>mapUserInfoLock[userAddress][lockID]</code>
            </li>
            <li>
              The <code>unlock</code> function takes an array of lock IDs, not a single ID
            </li>
            <li>Locks have properties: amount, startTime, endTime, and rewardDebt</li>
          </ol>

          <p className="text-sm text-muted-foreground">This tool will help determine if:</p>

          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>The critical functions exist in the ABI</li>
            <li>The functions can be called successfully</li>
            <li>The contract state contains the expected data</li>
          </ol>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="text-sm text-blue-500">
              <strong>Next Steps:</strong> After running the diagnostics, please share the results to help identify the
              exact issue with lock data retrieval.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

