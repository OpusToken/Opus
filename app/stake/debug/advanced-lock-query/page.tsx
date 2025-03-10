"use client"

import { useState, useEffect, useRef } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

export default function AdvancedLockQueryPage() {
  const [address, setAddress] = useState("")
  const [contractAddress, setContractAddress] = useState(STAKING_CONTRACT_ADDRESS)
  const [customAbi, setCustomAbi] = useState("")
  const [functionName, setFunctionName] = useState("getUserLocks")
  const [functionParams, setFunctionParams] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [useCustomAbi, setUseCustomAbi] = useState(false)
  const [useRawCall, setUseRawCall] = useState(false)
  const [functionSignature, setFunctionSignature] = useState("")
  const [rawCallData, setRawCallData] = useState("")
  const [methodType, setMethodType] = useState<"direct" | "ids-first" | "raw" | "custom">("direct")
  const [showRawData, setShowRawData] = useState(false)
  const [tryAllMethodsFlag, setTryAllMethods] = useState(true)

  const logsEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of logs when they update
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  // Clear logs
  const clearLogs = () => {
    setLogs([])
  }

  // Parse function parameters
  const parseFunctionParams = (paramsString: string): any[] => {
    if (!paramsString.trim()) return []

    try {
      // Try to parse as JSON
      return JSON.parse(`[${paramsString}]`)
    } catch (e) {
      // If not valid JSON, split by comma and try to parse each value
      return paramsString.split(",").map((param) => {
        const trimmed = param.trim()
        // Try to parse as number or boolean
        if (trimmed === "true") return true
        if (trimmed === "false") return false
        if (!isNaN(Number(trimmed))) return Number(trimmed)
        // Otherwise treat as string
        return trimmed
      })
    }
  }

  // Get contract instance
  const getContract = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      if (useCustomAbi) {
        if (!customAbi) {
          throw new Error("Custom ABI is required when using custom ABI option")
        }

        try {
          const parsedAbi = JSON.parse(customAbi)
          return new ethers.Contract(contractAddress, parsedAbi, provider)
        } catch (e) {
          throw new Error(`Invalid ABI format: ${e.message}`)
        }
      } else {
        return new ethers.Contract(contractAddress, STAKING_CONTRACT_ABI, provider)
      }
    } catch (e) {
      throw new Error(`Failed to create contract instance: ${e.message}`)
    }
  }

  // Direct method call
  const callDirectMethod = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    clearLogs()

    addLog(`Starting direct method call: ${functionName}`)
    addLog(`Contract address: ${contractAddress}`)
    addLog(`User address: ${address}`)

    try {
      const contract = await getContract()

      // Parse function parameters
      let params = [address]
      if (functionParams) {
        const additionalParams = parseFunctionParams(functionParams)
        params = [...params, ...additionalParams]
        addLog(`Using parameters: ${JSON.stringify(params)}`)
      }

      // Check if function exists on contract
      if (typeof contract[functionName] !== "function") {
        addLog(`WARNING: Function ${functionName} not found on contract`)
      }

      // Call the function
      addLog(`Calling ${functionName}...`)
      const result = await contract[functionName](...params)
      addLog(`Call successful!`)

      // Process result
      let processedResult
      if (Array.isArray(result)) {
        addLog(`Result is an array with ${result.length} items`)
        processedResult = result.map((item, index) => {
          // Try to format the result in a readable way
          if (typeof item === "object") {
            // For objects/structs
            const formattedItem = {}
            for (const [key, value] of Object.entries(item)) {
              if (typeof value === "bigint") {
                formattedItem[key] = {
                  raw: value.toString(),
                  formatted: ethers.formatUnits(value, 18),
                }
              } else {
                formattedItem[key] = value
              }
            }
            return formattedItem
          } else if (typeof item === "bigint") {
            // For bigint values
            return {
              raw: item.toString(),
              formatted: ethers.formatUnits(item, 18),
            }
          } else {
            // For other types
            return item
          }
        })
      } else if (typeof result === "object") {
        addLog(`Result is an object with keys: ${Object.keys(result).join(", ")}`)
        processedResult = {}
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === "bigint") {
            processedResult[key] = {
              raw: value.toString(),
              formatted: ethers.formatUnits(value, 18),
            }
          } else {
            processedResult[key] = value
          }
        }
      } else {
        addLog(`Result is a ${typeof result}`)
        processedResult = result
      }

      setResult({
        method: functionName,
        rawResult: result,
        processedResult,
      })

      addLog(`Result processed successfully`)
    } catch (err: any) {
      console.error("Error calling method:", err)
      addLog(`ERROR: ${err.message}`)
      setError(err.message || "An error occurred while calling the method")
    } finally {
      setLoading(false)
    }
  }

  // IDs first method
  const callIdsFirstMethod = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    clearLogs()

    addLog(`Starting IDs-first method`)
    addLog(`Contract address: ${contractAddress}`)
    addLog(`User address: ${address}`)

    try {
      const contract = await getContract()

      // First get lock IDs
      addLog(`Calling getUserLockIds...`)
      let lockIds
      try {
        lockIds = await contract.getUserLockIds(address)
        addLog(`Found ${lockIds.length} lock IDs: ${lockIds.map((id) => id.toString()).join(", ")}`)
      } catch (err) {
        addLog(`ERROR getting lock IDs: ${err.message}`)
        addLog(`Trying alternative method: getUserLockPositions...`)

        try {
          lockIds = await contract.getUserLockPositions(address)
          addLog(`Found ${lockIds.length} lock positions: ${lockIds.map((id) => id.toString()).join(", ")}`)
        } catch (err2) {
          addLog(`ERROR getting lock positions: ${err2.message}`)
          throw new Error("Failed to get lock IDs or positions")
        }
      }

      if (!lockIds || lockIds.length === 0) {
        addLog(`No lock IDs found for this address`)
        setResult({
          method: "IDs-first",
          rawResult: [],
          processedResult: [],
        })
        return
      }

      // Now get details for each lock ID
      addLog(`Getting details for each lock ID...`)
      const lockPromises = lockIds.map(async (id, index) => {
        try {
          addLog(`Getting info for lock ID ${id.toString()}...`)

          // Try getLockInfo first
          try {
            const lockInfo = await contract.getLockInfo(id)
            addLog(`Successfully got info for lock ID ${id.toString()}`)
            return {
              id: id.toString(),
              ...lockInfo,
              // Add formatted values
              formattedAmount: ethers.formatUnits(lockInfo.amount || lockInfo[1] || 0, 18),
              startDate: new Date(Number(lockInfo.startTime || lockInfo[2] || 0) * 1000).toLocaleString(),
              endDate: new Date(Number(lockInfo.endTime || lockInfo[3] || 0) * 1000).toLocaleString(),
            }
          } catch (err) {
            addLog(`ERROR getting lock info: ${err.message}`)

            // Try getLock as fallback
            try {
              addLog(`Trying getLock as fallback...`)
              const lock = await contract.getLock(id)
              addLog(`Successfully got lock using getLock`)
              return {
                id: id.toString(),
                ...lock,
                // Add formatted values
                formattedAmount: ethers.formatUnits(lock.amount || lock[1] || 0, 18),
                startDate: new Date(Number(lock.startTime || lock[2] || 0) * 1000).toLocaleString(),
                endDate: new Date(Number(lock.endTime || lock[3] || 0) * 1000).toLocaleString(),
              }
            } catch (err2) {
              addLog(`ERROR getting lock with getLock: ${err2.message}`)

              // Try one more fallback with viewLock
              try {
                addLog(`Trying viewLock as fallback...`)
                const lock = await contract.viewLock(id)
                addLog(`Successfully got lock using viewLock`)
                return {
                  id: id.toString(),
                  ...lock,
                  // Add formatted values
                  formattedAmount: ethers.formatUnits(lock.amount || lock[1] || 0, 18),
                  startDate: new Date(Number(lock.startTime || lock[2] || 0) * 1000).toLocaleString(),
                  endDate: new Date(Number(lock.endTime || lock[3] || 0) * 1000).toLocaleString(),
                }
              } catch (err3) {
                addLog(`ERROR getting lock with viewLock: ${err3.message}`)
                addLog(`Failed to get details for lock ID ${id.toString()} using any method`)
                return null
              }
            }
          }
        } catch (err) {
          addLog(`ERROR processing lock ID ${id.toString()}: ${err.message}`)
          return null
        }
      })

      const lockDetails = await Promise.all(lockPromises)
      const validLocks = lockDetails.filter((lock) => lock !== null)

      addLog(`Successfully retrieved ${validLocks.length} locks out of ${lockIds.length} IDs`)

      setResult({
        method: "IDs-first",
        rawResult: validLocks,
        processedResult: validLocks,
      })
    } catch (err: any) {
      console.error("Error in IDs-first method:", err)
      addLog(`ERROR: ${err.message}`)
      setError(err.message || "An error occurred while querying locks")
    } finally {
      setLoading(false)
    }
  }

  // Raw call method
  const callRawMethod = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    if (!functionSignature) {
      setError("Please enter a function signature")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    clearLogs()

    addLog(`Starting raw call method`)
    addLog(`Contract address: ${contractAddress}`)
    addLog(`User address: ${address}`)
    addLog(`Function signature: ${functionSignature}`)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      // Generate function selector
      const selector = ethers.id(functionSignature).slice(0, 10)
      addLog(`Function selector: ${selector}`)

      // Encode address parameter
      const encodedAddress = ethers.zeroPadValue(address, 32)
      addLog(`Encoded address: ${encodedAddress}`)

      // Combine selector and parameters
      let callData
      if (rawCallData) {
        // Use custom call data if provided
        callData = rawCallData
        addLog(`Using custom call data: ${callData}`)
      } else {
        // Otherwise generate from selector and address
        callData = ethers.concat([selector, encodedAddress])
        addLog(`Generated call data: ${callData}`)
      }

      // Make the call
      addLog(`Making raw call to contract...`)
      const result = await provider.call({
        to: contractAddress,
        data: callData,
      })

      addLog(`Raw call successful!`)
      addLog(`Raw result: ${result}`)

      if (result === "0x") {
        addLog(`WARNING: Empty result (0x)`)
        setResult({
          method: "Raw call",
          rawResult: result,
          processedResult: "Empty result (0x)",
        })
        return
      }

      // Try to decode the result
      addLog(`Attempting to decode result...`)

      // Try different decoding formats
      const decodingFormats = [
        ["tuple(uint256,uint256,uint256,uint256,uint256)[]"],
        ["tuple(uint256,uint256,uint256,uint256,uint256,uint256)[]"],
        ["tuple(uint256 id,uint256 amount,uint256 startTime,uint256 endTime,uint256 lockPeriod)[]"],
        ["tuple(uint256 id,uint256 amount,uint256 startTime,uint256 endTime,uint256 rewardRate)[]"],
        ["tuple(uint256 nonce,uint256 amount,uint256 startTime,uint256 endTime,uint256 lockPeriod)[]"],
        ["uint256[]"],
        ["tuple(uint256,uint256,uint256,uint256)[]"],
      ]

      let decodedResult = null
      for (const format of decodingFormats) {
        try {
          addLog(`Trying to decode with format: ${format}`)
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(format, result)
          addLog(`Successfully decoded with format: ${format}`)
          decodedResult = decoded
          break
        } catch (e) {
          addLog(`Failed to decode with format ${format}: ${e.message}`)
        }
      }

      if (decodedResult) {
        // Process the decoded result
        let processedResult
        if (Array.isArray(decodedResult) && decodedResult.length > 0) {
          const firstItem = decodedResult[0]
          if (Array.isArray(firstItem)) {
            // Array of arrays/tuples
            processedResult = firstItem.map((item, index) => {
              if (typeof item === "object") {
                // For objects/structs
                const formattedItem = {}
                for (const [key, value] of Object.entries(item)) {
                  if (typeof value === "bigint") {
                    formattedItem[key] = {
                      raw: value.toString(),
                      formatted: ethers.formatUnits(value, 18),
                    }
                  } else {
                    formattedItem[key] = value
                  }
                }
                return formattedItem
              } else if (typeof item === "bigint") {
                // For bigint values in a tuple
                return {
                  [`value${index}`]: {
                    raw: item.toString(),
                    formatted: ethers.formatUnits(item, 18),
                  },
                }
              } else {
                // For other types
                return item
              }
            })
          } else {
            // Single array
            processedResult = firstItem
          }
        } else {
          processedResult = decodedResult
        }

        setResult({
          method: "Raw call",
          rawResult: result,
          decodedResult,
          processedResult,
        })
      } else {
        // If we couldn't decode, just return the raw result
        addLog(`Could not decode result with any format`)
        setResult({
          method: "Raw call",
          rawResult: result,
          processedResult: "Could not decode result",
        })
      }
    } catch (err: any) {
      console.error("Error in raw call:", err)
      addLog(`ERROR: ${err.message}`)
      setError(err.message || "An error occurred during the raw call")
    } finally {
      setLoading(false)
    }
  }

  // Try all methods
  const tryAllMethods = async () => {
    if (!address) {
      setError("Please enter a wallet address")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    clearLogs()

    addLog(`Starting comprehensive query with all methods`)
    addLog(`Contract address: ${contractAddress}`)
    addLog(`User address: ${address}`)

    try {
      const contract = await getContract()
      const results = []

      // List of methods to try
      const methodsToTry = [
        { name: "getUserLocks", params: [address] },
        { name: "getLockPositions", params: [address] },
        { name: "getLocks", params: [address] },
        { name: "getUserLockInfo", params: [address] },
        { name: "mapUserLocks", params: [address] },
        { name: "getUserLockPositions", params: [address] },
        { name: "viewUserLocks", params: [address] },
        { name: "getUserLocks", params: [address, true] },
        { name: "getUserLocks", params: [address, false] },
      ]

      // Try each method
      for (const method of methodsToTry) {
        try {
          addLog(`Trying method: ${method.name} with params: ${JSON.stringify(method.params)}`)

          // Check if function exists on contract
          if (typeof contract[method.name] !== "function") {
            addLog(`Method ${method.name} not found on contract, skipping`)
            continue
          }

          // Call the method
          const result = await contract[method.name](...method.params)
          addLog(`Call to ${method.name} successful!`)

          // Process result
          if (result) {
            if (Array.isArray(result)) {
              addLog(`Result is an array with ${result.length} items`)
              if (result.length > 0) {
                results.push({
                  method: method.name,
                  result,
                  success: true,
                })
              } else {
                addLog(`Array is empty, considering method unsuccessful`)
              }
            } else if (typeof result === "object") {
              addLog(`Result is an object with keys: ${Object.keys(result).join(", ")}`)
              results.push({
                method: method.name,
                result,
                success: true,
              })
            } else {
              addLog(`Result is a ${typeof result}: ${result}`)
              results.push({
                method: method.name,
                result,
                success: true,
              })
            }
          } else {
            addLog(`Method returned ${result}, considering unsuccessful`)
          }
        } catch (err: any) {
          addLog(`ERROR with method ${method.name}: ${err.message}`)
        }
      }

      // Try IDs-first approach
      try {
        addLog(`Trying IDs-first approach...`)

        // Try to get lock IDs
        let lockIds
        try {
          lockIds = await contract.getUserLockIds(address)
          addLog(`Found ${lockIds.length} lock IDs`)
        } catch (err) {
          addLog(`Failed to get lock IDs: ${err.message}`)
          lockIds = null
        }

        if (lockIds && lockIds.length > 0) {
          const lockDetails = []

          // Get details for each lock ID
          for (const id of lockIds) {
            try {
              addLog(`Getting info for lock ID ${id.toString()}...`)
              const lockInfo = await contract.getLockInfo(id)
              lockDetails.push({
                id: id.toString(),
                ...lockInfo,
              })
            } catch (err) {
              addLog(`Failed to get info for lock ID ${id.toString()}: ${err.message}`)

              // Try alternative methods
              try {
                addLog(`Trying getLock as fallback...`)
                const lock = await contract.getLock(id)
                lockDetails.push({
                  id: id.toString(),
                  ...lock,
                })
              } catch (err2) {
                addLog(`Failed with getLock, trying viewLock...`)
                try {
                  const lock = await contract.viewLock(id)
                  lockDetails.push({
                    id: id.toString(),
                    ...lock,
                  })
                } catch (err3) {
                  addLog(`All methods failed for lock ID ${id.toString()}`)
                }
              }
            }
          }

          if (lockDetails.length > 0) {
            results.push({
              method: "IDs-first",
              result: lockDetails,
              success: true,
            })
          }
        }
      } catch (err) {
        addLog(`ERROR with IDs-first approach: ${err.message}`)
      }

      // Try raw call approach
      try {
        addLog(`Trying raw call approach...`)

        const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
        const selector = ethers.id("getUserLocks(address)").slice(0, 10)
        const encodedAddress = ethers.zeroPadValue(address, 32)
        const callData = ethers.concat([selector, encodedAddress])

        addLog(`Making raw call with selector: ${selector}`)
        const result = await provider.call({
          to: contractAddress,
          data: callData,
        })

        if (result && result !== "0x") {
          addLog(`Raw call successful!`)

          // Try to decode
          let decoded = null
          const decodingFormats = [
            ["tuple(uint256,uint256,uint256,uint256,uint256)[]"],
            ["tuple(uint256,uint256,uint256,uint256,uint256,uint256)[]"],
            ["tuple(uint256 id,uint256 amount,uint256 startTime,uint256 endTime,uint256 lockPeriod)[]"],
          ]

          for (const format of decodingFormats) {
            try {
              decoded = ethers.AbiCoder.defaultAbiCoder().decode(format, result)[0]
              addLog(`Successfully decoded with format: ${format}`)
              break
            } catch (e) {
              // Continue to next format
            }
          }

          if (decoded) {
            results.push({
              method: "Raw call",
              result: decoded,
              success: true,
            })
          } else {
            addLog(`Could not decode raw call result`)
          }
        } else {
          addLog(`Raw call returned empty result`)
        }
      } catch (err) {
        addLog(`ERROR with raw call approach: ${err.message}`)
      }

      // Process results
      if (results.length > 0) {
        addLog(`Found ${results.length} successful methods`)

        // Find the method with the most data
        let bestResult = results[0]
        for (const result of results) {
          if (Array.isArray(result.result)) {
            if (!Array.isArray(bestResult.result) || result.result.length > bestResult.result.length) {
              bestResult = result
            }
          }
        }

        addLog(`Best method appears to be: ${bestResult.method}`)

        // Process the best result
        let processedResult
        if (Array.isArray(bestResult.result)) {
          processedResult = bestResult.result.map((item) => {
            // Format the item
            const formatted = {}
            for (const [key, value] of Object.entries(item)) {
              if (typeof value === "bigint") {
                formatted[key] = {
                  raw: value.toString(),
                  formatted: ethers.formatUnits(value, 18),
                }
              } else {
                formatted[key] = value
              }
            }
            return formatted
          })
        } else {
          processedResult = bestResult.result
        }

        setResult({
          method: bestResult.method,
          rawResult: bestResult.result,
          processedResult,
          allResults: results,
        })

        // Show success message
        toast({
          title: "Query Successful",
          description: `Found locks using method: ${bestResult.method}`,
        })
      } else {
        addLog(`No successful methods found`)
        setError("No successful methods found")
      }
    } catch (err: any) {
      console.error("Error in comprehensive query:", err)
      addLog(`ERROR: ${err.message}`)
      setError(err.message || "An error occurred during the query")
    } finally {
      setLoading(false)
    }
  }

  // Handle query button click
  const handleQuery = () => {
    if (tryAllMethodsFlag) {
      return tryAllMethods()
    }

    switch (methodType) {
      case "direct":
        return callDirectMethod()
      case "ids-first":
        return callIdsFirstMethod()
      case "raw":
        return callRawMethod()
      default:
        return callDirectMethod()
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Advanced Lock Query Tool</h1>
      <p className="text-muted-foreground mb-6">
        This tool provides multiple approaches to query lock data from the staking contract.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Query Configuration</CardTitle>
              <CardDescription>Configure how to query the contract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Wallet Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter wallet address (0x...)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractAddress">Contract Address</Label>
                <Input
                  id="contractAddress"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="Enter contract address (0x...)"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tryAllMethods"
                  checked={tryAllMethodsFlag}
                  onCheckedChange={(checked) => setTryAllMethods(checked === true)}
                />
                <Label htmlFor="tryAllMethods">Try all methods (recommended)</Label>
              </div>

              {!tryAllMethodsFlag && (
                <>
                  <div className="space-y-2">
                    <Label>Query Method</Label>
                    <Select value={methodType} onValueChange={(value) => setMethodType(value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct Method Call</SelectItem>
                        <SelectItem value="ids-first">IDs First Approach</SelectItem>
                        <SelectItem value="raw">Raw Contract Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {methodType === "direct" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="functionName">Function Name</Label>
                        <Input
                          id="functionName"
                          value={functionName}
                          onChange={(e) => setFunctionName(e.target.value)}
                          placeholder="e.g., getUserLocks"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="functionParams">Additional Parameters (optional)</Label>
                        <Input
                          id="functionParams"
                          value={functionParams}
                          onChange={(e) => setFunctionParams(e.target.value)}
                          placeholder="e.g., true, 123"
                        />
                        <p className="text-xs text-muted-foreground">
                          Comma-separated values. Address is automatically included as first parameter.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useCustomAbi"
                          checked={useCustomAbi}
                          onCheckedChange={(checked) => setUseCustomAbi(checked === true)}
                        />
                        <Label htmlFor="useCustomAbi">Use custom ABI</Label>
                      </div>

                      {useCustomAbi && (
                        <div className="space-y-2">
                          <Label htmlFor="customAbi">Custom ABI</Label>
                          <Textarea
                            id="customAbi"
                            value={customAbi}
                            onChange={(e) => setCustomAbi(e.target.value)}
                            placeholder="Paste contract ABI here..."
                            className="h-32"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {methodType === "raw" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="functionSignature">Function Signature</Label>
                        <Input
                          id="functionSignature"
                          value={functionSignature}
                          onChange={(e) => setFunctionSignature(e.target.value)}
                          placeholder="e.g., getUserLocks(address)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rawCallData">Custom Call Data (optional)</Label>
                        <Input
                          id="rawCallData"
                          value={rawCallData}
                          onChange={(e) => setRawCallData(e.target.value)}
                          placeholder="0x..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty to auto-generate from function signature and address.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}

              <Button className="w-full" onClick={handleQuery} disabled={loading || !address}>
                {loading ? "Querying..." : "Query Locks"}
              </Button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debug Logs</CardTitle>
              <CardDescription>Real-time logs of the query process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-2 h-[400px] overflow-y-auto text-xs font-mono">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground p-2">Logs will appear here...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="py-1 border-b border-muted-foreground/10 whitespace-pre-wrap">
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={clearLogs}>
                Clear Logs
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Query Results</CardTitle>
              <CardDescription>{result ? `Results from ${result.method} method` : "No results yet"}</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Method: {result.method}</h3>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showRawData"
                        checked={showRawData}
                        onCheckedChange={(checked) => setShowRawData(checked === true)}
                      />
                      <Label htmlFor="showRawData">Show raw data</Label>
                    </div>
                  </div>

                  {showRawData && (
                    <div className="bg-muted rounded-md p-4 overflow-x-auto">
                      <pre className="text-xs">
                        {JSON.stringify(
                          result.rawResult,
                          (key, value) => (typeof value === "bigint" ? value.toString() : value),
                          2,
                        )}
                      </pre>
                    </div>
                  )}

                  {Array.isArray(result.processedResult) ? (
                    <div className="space-y-4">
                      <h3 className="text-md font-medium">Found {result.processedResult.length} locks:</h3>

                      {result.processedResult.length > 0 ? (
                        result.processedResult.map((lock, index) => (
                          <Card key={index}>
                            <CardContent className="pt-6">
                              <div className="grid grid-cols-2 gap-4">
                                {Object.entries(lock).map(([key, value]) => {
                                  // Skip rendering some internal properties
                                  if (key.startsWith("_")) return null

                                  // Format the value based on its type and key name
                                  let displayValue
                                  if (value && typeof value === "object" && "formatted" in value) {
                                    // For pre-formatted values
                                    displayValue = value.formatted

                                    // Add units for amount
                                    if (key.toLowerCase().includes("amount")) {
                                      displayValue += " OPUS"
                                    }
                                  } else if (key.toLowerCase().includes("time") || key.toLowerCase().includes("date")) {
                                    // For timestamps
                                    try {
                                      const timestamp = Number(value)
                                      if (!isNaN(timestamp) && timestamp > 1000000000) {
                                        // Sanity check for unix timestamp
                                        displayValue = new Date(timestamp * 1000).toLocaleString()
                                      } else {
                                        displayValue = String(value)
                                      }
                                    } catch (e) {
                                      displayValue = String(value)
                                    }
                                  } else if (typeof value === "bigint") {
                                    // For bigint values
                                    displayValue = value.toString()

                                    // Try to format as token amount if it looks like one
                                    if (value > 1000000000000000n) {
                                      displayValue += ` (${ethers.formatUnits(value, 18)} OPUS)`
                                    }
                                  } else {
                                    // For other types
                                    displayValue = String(value)
                                  }

                                  // Format the key for display
                                  const displayKey = key
                                    .replace(/([A-Z])/g, " $1") // Add spaces before capital letters
                                    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter

                                  return (
                                    <div key={key}>
                                      <p className="text-sm font-medium">{displayKey}</p>
                                      <p className="text-sm text-muted-foreground break-all">{displayValue}</p>
                                    </div>
                                  )
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                          <p className="text-sm text-yellow-500">No locks found for this address.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-muted rounded-md">
                      <pre className="text-sm whitespace-pre-wrap">
                        {JSON.stringify(result.processedResult, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.allResults && (
                    <div className="mt-6">
                      <h3 className="text-md font-medium mb-2">All Successful Methods:</h3>
                      <div className="space-y-2">
                        {result.allResults.map((r, index) => (
                          <div key={index} className="p-2 bg-muted rounded-md">
                            <p className="text-sm font-medium">{r.method}</p>
                            <p className="text-xs text-muted-foreground">
                              {Array.isArray(r.result)
                                ? `Found ${r.result.length} items`
                                : `Result type: ${typeof r.result}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">No results yet. Configure your query and click "Query Locks".</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Based on transaction analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <h3 className="text-md font-medium text-blue-500 mb-2">Recommended Approach</h3>
                <p className="text-sm text-blue-500">
                  Based on transaction analysis, the most reliable approach is to:
                </p>
                <ol className="list-decimal list-inside text-sm text-blue-500 mt-2 space-y-1">
                  <li>
                    First get lock IDs using <code>getUserLockIds(address)</code>
                  </li>
                  <li>
                    Then get details for each ID using <code>getLockInfo(uint256)</code>
                  </li>
                </ol>
              </div>

              <div className="space-y-2">
                <h3 className="text-md font-medium">Common Function Names</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">getUserLocks(address)</p>
                    <p className="text-xs text-muted-foreground">Get all locks for a user</p>
                  </div>
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">getUserLockIds(address)</p>
                    <p className="text-xs text-muted-foreground">Get IDs of all locks for a user</p>
                  </div>
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">getLockInfo(uint256)</p>
                    <p className="text-xs text-muted-foreground">Get details of a specific lock</p>
                  </div>
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">getLockPositions(address)</p>
                    <p className="text-xs text-muted-foreground">Alternative name for getUserLocks</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-md font-medium">Common Issues</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Contract might use non-standard function names</li>
                  <li>Lock IDs might be stored as nonces or indices</li>
                  <li>Some contracts require additional parameters (e.g., boolean flags)</li>
                  <li>ABI might not match the actual contract implementation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

