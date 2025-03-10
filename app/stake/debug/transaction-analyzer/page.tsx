"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"

export default function TransactionAnalyzerPage() {
  const [txHash, setTxHash] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default transaction hashes from the user
  const defaultTxHashes = [
    "0x5e3dd0aec735f6473fd91dba2170ccaa817d1062c96fecc90ea7e741cd08bd88",
    "0x452652830093b9cdeac4e2ccb79605ab8ab05ab0c25a8feb7d9a53b468446c35",
  ]

  // Analyze a transaction
  const analyzeTx = async (hash: string) => {
    if (!hash) {
      setError("Please enter a transaction hash")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Connect to PulseChain
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      // Get transaction details
      const tx = await provider.getTransaction(hash)
      if (!tx) {
        throw new Error("Transaction not found")
      }

      // Get transaction receipt for logs/events
      const receipt = await provider.getTransactionReceipt(hash)

      // Create contract interface to decode function calls and events
      const contractInterface = new ethers.Interface(STAKING_CONTRACT_ABI)

      // Try to decode the transaction input data
      let decodedInput = null
      try {
        decodedInput = contractInterface.parseTransaction({ data: tx.data, value: tx.value })
      } catch (e) {
        console.warn("Failed to decode input with ABI:", e)
        // If we can't decode with ABI, at least show the function selector
        decodedInput = {
          name: "Unknown Function",
          signature: "Unknown",
          args: [],
          sighash: tx.data.substring(0, 10),
          rawData: tx.data,
        }
      }

      // Try to decode events/logs
      const decodedLogs = []
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            if (log.address.toLowerCase() === STAKING_CONTRACT_ADDRESS.toLowerCase()) {
              const decodedLog = contractInterface.parseLog({
                topics: log.topics as string[],
                data: log.data,
              })
              decodedLogs.push({
                name: decodedLog.name,
                args: decodedLog.args,
                signature: decodedLog.signature,
                topic: log.topics[0],
              })
            } else {
              decodedLogs.push({
                name: "External Contract Log",
                address: log.address,
                topics: log.topics,
                data: log.data,
              })
            }
          } catch (e) {
            console.warn("Failed to decode log:", e)
            decodedLogs.push({
              name: "Unknown Event",
              topics: log.topics,
              data: log.data,
              address: log.address,
            })
          }
        }
      }

      // Get block information
      const block = await provider.getBlock(tx.blockNumber!)

      // Compile the result
      setResult({
        transaction: {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          gasLimit: tx.gasLimit.toString(),
          gasPrice: ethers.formatUnits(tx.gasPrice || 0, "gwei"),
          nonce: tx.nonce,
          blockNumber: tx.blockNumber,
          timestamp: block ? new Date(Number(block.timestamp) * 1000).toLocaleString() : "Unknown",
        },
        decodedInput,
        receipt: {
          status: receipt ? (receipt.status === 1 ? "Success" : "Failed") : "Unknown",
          gasUsed: receipt ? receipt.gasUsed.toString() : "Unknown",
          effectiveGasPrice: receipt ? ethers.formatUnits(receipt.gasPrice || 0, "gwei") : "Unknown",
          logs: decodedLogs,
        },
      })

      // Now let's try to find the lock ID from the transaction
      if (decodedLogs.length > 0) {
        // Look for events that might contain lock information
        const lockEvents = decodedLogs.filter(
          (log) =>
            log.name && (log.name.includes("Lock") || log.name.includes("Locked") || log.name.includes("TokensLocked")),
        )

        if (lockEvents.length > 0) {
          console.log("Found potential lock events:", lockEvents)

          // Try to extract lock ID from the events
          for (const event of lockEvents) {
            if (event.args) {
              // Look for common parameter names that might be lock IDs
              const possibleIdParams = ["id", "lockId", "nonce", "index", "position"]

              for (const param of possibleIdParams) {
                if (event.args[param] !== undefined) {
                  console.log(`Found potential lock ID in parameter '${param}':`, event.args[param])
                  setResult((prev) => ({
                    ...prev,
                    lockId: {
                      value: event.args[param].toString(),
                      source: `${event.name}.${param}`,
                    },
                  }))
                  break
                }
              }

              // If we didn't find a named parameter, check numeric indices
              if (!result?.lockId) {
                // Check if any numeric parameter might be a lock ID (usually small integers)
                for (const [key, value] of Object.entries(event.args)) {
                  if (!isNaN(Number(key)) && typeof value === "bigint" && value < 1000000n) {
                    console.log(`Found potential lock ID at index ${key}:`, value.toString())
                    setResult((prev) => ({
                      ...prev,
                      lockId: {
                        value: value.toString(),
                        source: `${event.name}[${key}]`,
                      },
                    }))
                    break
                  }
                }
              }
            }
          }
        }
      }

      // If we still don't have a lock ID, try to extract it from the input parameters
      if (!result?.lockId && decodedInput && decodedInput.args) {
        // Check if the function name suggests it's a lock function
        if (decodedInput.name && (decodedInput.name.includes("lock") || decodedInput.name.includes("Lock"))) {
          console.log("Function appears to be a lock function:", decodedInput.name)

          // For lock creation, the important parameters are usually amount and duration
          const lockParams = {
            amount: null,
            duration: null,
          }

          // Look for parameters that might be amount or duration
          for (const [key, value] of Object.entries(decodedInput.args)) {
            if (typeof value === "bigint") {
              // Large numbers are likely token amounts (in wei)
              if (value > 1000000000000000n && !lockParams.amount) {
                lockParams.amount = ethers.formatUnits(value, 18)
                console.log(`Found potential lock amount: ${lockParams.amount} tokens`)
              }
              // Smaller numbers might be durations (in days or seconds)
              else if (value < 10000n && !lockParams.duration) {
                lockParams.duration = value.toString()
                console.log(`Found potential lock duration: ${lockParams.duration}`)
              }
            }
          }

          if (lockParams.amount || lockParams.duration) {
            setResult((prev) => ({
              ...prev,
              lockParams,
            }))
          }
        }
      }
    } catch (err: any) {
      console.error("Error analyzing transaction:", err)
      setError(err.message || "An error occurred while analyzing the transaction")
    } finally {
      setLoading(false)
    }
  }

  // Analyze a default transaction on initial load
  useEffect(() => {
    if (defaultTxHashes.length > 0) {
      setTxHash(defaultTxHashes[0])
      analyzeTx(defaultTxHashes[0])
    }
  }, [])

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Transaction Analyzer</h1>
      <p className="text-muted-foreground mb-6">
        This tool analyzes transactions to understand how the locking mechanism works.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Hash</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." />
            <Button onClick={() => analyzeTx(txHash)} disabled={loading || !txHash}>
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </div>

          <div className="flex space-x-2">
            {defaultTxHashes.map((hash, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => {
                  setTxHash(hash)
                  analyzeTx(hash)
                }}
                disabled={loading}
              >
                Example {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md mb-6">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : null}

      {result ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="input">Input Data</TabsTrigger>
            <TabsTrigger value="events">Events & Logs</TabsTrigger>
            <TabsTrigger value="lockInfo">Lock Info</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Hash</p>
                    <p className="text-sm text-muted-foreground break-all">{result.transaction.hash}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">{result.receipt.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">From</p>
                    <p className="text-sm text-muted-foreground break-all">{result.transaction.from}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">To</p>
                    <p className="text-sm text-muted-foreground break-all">{result.transaction.to}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Value</p>
                    <p className="text-sm text-muted-foreground">{result.transaction.value} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Gas Used</p>
                    <p className="text-sm text-muted-foreground">{result.receipt.gasUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Block Number</p>
                    <p className="text-sm text-muted-foreground">{result.transaction.blockNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Timestamp</p>
                    <p className="text-sm text-muted-foreground">{result.transaction.timestamp}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Function Call</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Function Name</p>
                    <p className="text-sm text-muted-foreground">{result.decodedInput.name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Function Signature</p>
                    <p className="text-sm text-muted-foreground">{result.decodedInput.signature || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Function Selector</p>
                    <p className="text-sm text-muted-foreground">{result.decodedInput.sighash || "Unknown"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="input" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Decoded Input Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                {result.decodedInput.args && Object.keys(result.decodedInput.args).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(result.decodedInput.args).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <p className="text-sm font-medium">Parameter {key}</p>
                        <p className="text-sm text-muted-foreground break-all">
                          {typeof value === "bigint"
                            ? `${value.toString()} (${ethers.formatUnits(value, 18)} if token amount)`
                            : JSON.stringify(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No parameters or unable to decode parameters</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Raw Input Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[200px]">
                  <pre className="text-xs p-4 bg-muted rounded-md break-all">
                    {result.decodedInput.rawData || "No data available"}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Emitted Events</CardTitle>
              </CardHeader>
              <CardContent>
                {result.receipt.logs && result.receipt.logs.length > 0 ? (
                  <div className="space-y-6">
                    {result.receipt.logs.map((log: any, index: number) => (
                      <div key={index} className="p-4 border rounded-md">
                        <p className="text-sm font-medium mb-2">
                          Event {index + 1}: {log.name}
                        </p>

                        {log.signature && (
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground">Signature: {log.signature}</p>
                          </div>
                        )}

                        {log.address && (
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground">Contract: {log.address}</p>
                          </div>
                        )}

                        {log.args && Object.keys(log.args).length > 0 ? (
                          <div className="space-y-2 mt-4">
                            <p className="text-xs font-medium">Arguments:</p>
                            {Object.entries(log.args).map(([key, value]: [string, any]) => (
                              <div key={key} className="pl-2 border-l-2 border-muted-foreground/20">
                                <p className="text-xs font-medium">{key}:</p>
                                <p className="text-xs text-muted-foreground break-all">
                                  {typeof value === "bigint"
                                    ? `${value.toString()} (${ethers.formatUnits(value, 18)} if token amount)`
                                    : JSON.stringify(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 mt-4">
                            <p className="text-xs font-medium">Topics:</p>
                            {log.topics &&
                              log.topics.map((topic: string, i: number) => (
                                <p key={i} className="text-xs text-muted-foreground break-all">
                                  {i === 0 ? "Event Hash: " : `Topic ${i}: `}
                                  {topic}
                                </p>
                              ))}

                            {log.data && (
                              <div className="mt-2">
                                <p className="text-xs font-medium">Data:</p>
                                <p className="text-xs text-muted-foreground break-all">{log.data}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No events emitted</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lockInfo" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Lock Information</CardTitle>
              </CardHeader>
              <CardContent>
                {result.lockId ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Lock ID</p>
                      <p className="text-sm text-green-500 font-bold">{result.lockId.value}</p>
                      <p className="text-xs text-muted-foreground">Found in: {result.lockId.source}</p>
                    </div>

                    {result.lockParams && (
                      <>
                        {result.lockParams.amount && (
                          <div>
                            <p className="text-sm font-medium">Lock Amount</p>
                            <p className="text-sm text-muted-foreground">{result.lockParams.amount} OPUS</p>
                          </div>
                        )}

                        {result.lockParams.duration && (
                          <div>
                            <p className="text-sm font-medium">Lock Duration</p>
                            <p className="text-sm text-muted-foreground">
                              {result.lockParams.duration} (days or seconds)
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <p className="text-sm text-blue-500">
                        <strong>Recommendation:</strong> Use this Lock ID to query lock details using the contract's
                        getLockInfo(uint256) method.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-yellow-500">No explicit Lock ID found in this transaction.</p>

                    {result.lockParams && (
                      <div>
                        <p className="text-sm font-medium">Lock Parameters</p>
                        {result.lockParams.amount && (
                          <p className="text-sm text-muted-foreground">Amount: {result.lockParams.amount} OPUS</p>
                        )}
                        {result.lockParams.duration && (
                          <p className="text-sm text-muted-foreground">Duration: {result.lockParams.duration}</p>
                        )}
                      </div>
                    )}

                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                      <p className="text-sm text-yellow-500">
                        <strong>Note:</strong> The lock ID might be generated internally by the contract and not
                        directly visible in the transaction data. Try querying getUserLocks(address) to get all locks
                        for this user.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Lock Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Based on the analysis, here are recommended methods to query lock data:
                  </p>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">1. Get All User Locks</p>
                    <pre className="text-xs p-2 bg-muted rounded-md">
                      {`// JavaScript/ethers.js
const userLocks = await stakingContract.getUserLocks("${result.transaction.from}");`}
                    </pre>
                  </div>

                  {result.lockId && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">2. Get Specific Lock Info</p>
                      <pre className="text-xs p-2 bg-muted rounded-md">
                        {`// JavaScript/ethers.js
const lockInfo = await stakingContract.getLockInfo(${result.lockId.value});`}
                      </pre>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">3. Get Lock IDs First</p>
                    <pre className="text-xs p-2 bg-muted rounded-md">
                      {`// JavaScript/ethers.js
const lockIds = await stakingContract.getUserLockIds("${result.transaction.from}");
// Then get details for each ID
for (const id of lockIds) {
  const lockInfo = await stakingContract.getLockInfo(id);
  console.log("Lock Info:", lockInfo);
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : null}
    </div>
  )
}

