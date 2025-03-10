"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OPUS_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS, OPUS_TOKEN_ABI, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TransactionAnalyzerPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState("")
  const [txDetails, setTxDetails] = useState<any>(null)
  const [decodedInput, setDecodedInput] = useState<any>(null)
  const [decodedLogs, setDecodedLogs] = useState<any[]>([])

  // Predefined transaction hashes
  const predefinedTxHashes = [
    "0x5e3dd0aec735f6473fd91dba2170ccaa817d1062c96fecc90ea7e741cd08bd88",
    "0x702511863c77b6db9128671907d31b063738a3863a7f88b8c77e3750f3564d85",
  ]

  // Analyze transaction on mount
  useEffect(() => {
    if (predefinedTxHashes.length > 0) {
      setTxHash(predefinedTxHashes[0])
      analyzeTx(predefinedTxHashes[0])
    }
  }, [])

  const analyzeTx = async (hash: string) => {
    if (!hash) {
      setError("Please enter a transaction hash")
      return
    }

    setLoading(true)
    setError(null)
    setTxDetails(null)
    setDecodedInput(null)
    setDecodedLogs([])

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      // Get transaction and receipt
      const tx = await provider.getTransaction(hash)
      const receipt = await provider.getTransactionReceipt(hash)

      if (!tx || !receipt) {
        throw new Error("Transaction not found")
      }

      // Get block information
      const block = await provider.getBlock(receipt.blockNumber)

      // Format the transaction details
      const details = {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        blockTime: block ? new Date(block.timestamp * 1000).toLocaleString() : "Unknown",
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? "Success" : "Failed",
        data: tx.data,
        logs: receipt.logs,
      }

      setTxDetails(details)

      // Try to decode the input data
      try {
        // Check if the transaction is to the staking contract
        if (tx.to?.toLowerCase() === STAKING_CONTRACT_ADDRESS.toLowerCase()) {
          const stakingInterface = new ethers.Interface(STAKING_CONTRACT_ABI)
          const decoded = stakingInterface.parseTransaction({ data: tx.data, value: tx.value })

          setDecodedInput({
            name: decoded.name,
            args: decoded.args.map((arg) => arg.toString()),
          })
        }
      } catch (err) {
        console.warn("Failed to decode input data:", err)
      }

      // Try to decode the logs
      try {
        const stakingInterface = new ethers.Interface(STAKING_CONTRACT_ABI)
        const tokenInterface = new ethers.Interface(OPUS_TOKEN_ABI)

        const decoded = receipt.logs.map((log) => {
          try {
            let decodedLog

            // Try to decode with staking contract interface
            if (log.address.toLowerCase() === STAKING_CONTRACT_ADDRESS.toLowerCase()) {
              decodedLog = stakingInterface.parseLog(log)
            }
            // Try to decode with token contract interface
            else if (log.address.toLowerCase() === OPUS_TOKEN_ADDRESS.toLowerCase()) {
              decodedLog = tokenInterface.parseLog(log)
            }

            if (decodedLog) {
              return {
                address: log.address,
                name: decodedLog.name,
                args: decodedLog.args.map((arg) => arg.toString()),
                raw: log,
              }
            }

            return {
              address: log.address,
              name: "Unknown",
              args: [],
              raw: log,
            }
          } catch (err) {
            return {
              address: log.address,
              name: "Unknown",
              args: [],
              raw: log,
            }
          }
        })

        setDecodedLogs(decoded)
      } catch (err) {
        console.warn("Failed to decode logs:", err)
      }

      toast({
        title: "Transaction Analyzed",
        description: "Successfully analyzed the transaction",
      })
    } catch (err: any) {
      console.error("Error analyzing transaction:", err)
      setError(err.message || "Failed to analyze transaction")

      toast({
        title: "Error",
        description: "Failed to analyze transaction. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return ""
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Check if an address is a contract
  const isContract = (address: string) => {
    if (address.toLowerCase() === STAKING_CONTRACT_ADDRESS.toLowerCase()) {
      return "Staking Contract"
    } else if (address.toLowerCase() === OPUS_TOKEN_ADDRESS.toLowerCase()) {
      return "OPUS Token"
    }
    return "Unknown Contract"
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Transaction Analyzer</h1>
      <p className="text-muted-foreground mb-6">Analyze lock transactions to understand what happened</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Hash</CardTitle>
          <CardDescription>Enter or select a transaction hash to analyze</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Enter transaction hash (0x...)"
            />
            <Button onClick={() => analyzeTx(txHash)} disabled={loading || !txHash}>
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {predefinedTxHashes.map((hash, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setTxHash(hash)
                  analyzeTx(hash)
                }}
              >
                TX {index + 1}
              </Button>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {txDetails && (
        <Tabs defaultValue="overview" className="w-full mb-6">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="input">Input Data</TabsTrigger>
            <TabsTrigger value="logs">Event Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Overview</CardTitle>
                <CardDescription>Basic information about the transaction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium">Transaction Hash</p>
                      <p className="text-sm break-all">{txDetails.hash}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">Status</p>
                      <p className={`text-sm ${txDetails.status === "Success" ? "text-green-500" : "text-red-500"}`}>
                        {txDetails.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">Block</p>
                      <p className="text-sm">{txDetails.blockNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">Time</p>
                      <p className="text-sm">{txDetails.blockTime}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">From</p>
                      <p className="text-sm">
                        {formatAddress(txDetails.from)}
                        <span className="text-xs text-muted-foreground ml-2">(User)</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">To</p>
                      <p className="text-sm">
                        {formatAddress(txDetails.to)}
                        <span className="text-xs text-muted-foreground ml-2">({isContract(txDetails.to)})</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">Value</p>
                      <p className="text-sm">{txDetails.value} PLS</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">Gas Used</p>
                      <p className="text-sm">{txDetails.gasUsed}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium">Function Called</p>
                    <p className="text-sm">
                      {decodedInput ? (
                        <>
                          <span className="font-mono">{decodedInput.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({decodedInput.args.join(", ")})</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Unable to decode function</span>
                      )}
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium">Events Emitted</p>
                    {decodedLogs.length > 0 ? (
                      <ul className="space-y-1 mt-2">
                        {decodedLogs.map((log, index) => (
                          <li key={index} className="text-sm">
                            <span className="font-mono">{log.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              from {formatAddress(log.address)} ({isContract(log.address)})
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No events found or unable to decode events</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="input">
            <Card>
              <CardHeader>
                <CardTitle>Input Data</CardTitle>
                <CardDescription>Decoded function call and parameters</CardDescription>
              </CardHeader>
              <CardContent>
                {decodedInput ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium">Function Name</p>
                      <p className="text-sm font-mono">{decodedInput.name}</p>
                    </div>

                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium">Parameters</p>
                      <div className="space-y-2 mt-2">
                        {decodedInput.args.map((arg, index) => (
                          <div key={index}>
                            <p className="text-xs text-muted-foreground">Parameter {index + 1}</p>
                            <p className="text-sm break-all">{arg}</p>
                            {index === 0 && decodedInput.name === "lock" && (
                              <p className="text-xs text-green-500">{ethers.formatUnits(arg, 18)} OPUS</p>
                            )}
                            {index === 1 && decodedInput.name === "lock" && (
                              <p className="text-xs text-green-500">{arg} days</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm font-medium">Raw Input Data</p>
                      <p className="text-xs font-mono break-all mt-2">{txDetails.data}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted rounded-md text-center">
                    <p className="text-sm text-muted-foreground">
                      Unable to decode input data. This could be because the function signature is not in our ABI.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Event Logs</CardTitle>
                <CardDescription>Events emitted during the transaction</CardDescription>
              </CardHeader>
              <CardContent>
                {decodedLogs.length > 0 ? (
                  <div className="space-y-4">
                    {decodedLogs.map((log, index) => (
                      <div key={index} className="p-4 bg-muted rounded-md">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium font-mono">{log.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatAddress(log.address)} ({isContract(log.address)})
                          </p>
                        </div>

                        <div className="space-y-2 mt-4">
                          {log.args.map((arg, argIndex) => (
                            <div key={argIndex}>
                              <p className="text-xs text-muted-foreground">Argument {argIndex + 1}</p>
                              <p className="text-sm break-all">{arg}</p>

                              {/* Special formatting for known event types */}
                              {log.name === "Transfer" && argIndex === 2 && (
                                <p className="text-xs text-green-500">{ethers.formatUnits(arg, 18)} OPUS</p>
                              )}
                              {log.name === "LockToken" && argIndex === 0 && (
                                <p className="text-xs text-green-500">{ethers.formatUnits(arg, 18)} OPUS</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-muted rounded-md text-center">
                    <p className="text-sm text-muted-foreground">No events found or unable to decode events.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
          <CardDescription>What we can learn from these transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {txDetails ? (
              <>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-sm text-blue-500">
                    <strong>Transaction Status:</strong> {txDetails.status}
                  </p>
                  <p className="text-sm text-blue-500 mt-2">
                    <strong>Function Called:</strong> {decodedInput?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-blue-500 mt-2">
                    <strong>Events Emitted:</strong> {decodedLogs.map((log) => log.name).join(", ") || "None/Unknown"}
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium">What This Means</p>
                  <div className="space-y-2 mt-2 text-sm text-muted-foreground">
                    {decodedInput?.name === "lock" ? (
                      <>
                        <p>
                          This transaction called the <code>lock</code> function on the staking contract with
                          {decodedInput.args.length >= 2 ? (
                            <>
                              {" "}
                              <strong>{ethers.formatUnits(decodedInput.args[0], 18)} OPUS</strong> for
                              <strong> {decodedInput.args[1]} days</strong>
                            </>
                          ) : (
                            " parameters that couldn't be fully decoded"
                          )}
                          .
                        </p>

                        {decodedLogs.some((log) => log.name === "LockToken" || log.name === "Lock") ? (
                          <p>
                            The transaction successfully emitted a lock event, indicating that the tokens were locked in
                            the contract.
                          </p>
                        ) : (
                          <p>
                            No lock event was found in the logs. This might indicate that the lock operation didn't
                            complete successfully, even though the transaction itself succeeded.
                          </p>
                        )}
                      </>
                    ) : decodedInput?.name === "unlock" ? (
                      <>
                        <p>
                          This transaction called the <code>unlock</code> function on the staking contract.
                        </p>

                        {decodedLogs.some((log) => log.name === "UnLockToken" || log.name === "Unlock") ? (
                          <p>
                            The transaction successfully emitted an unlock event, indicating that the tokens were
                            unlocked from the contract.
                          </p>
                        ) : (
                          <p>
                            No unlock event was found in the logs. This might indicate that the unlock operation didn't
                            complete successfully, even though the transaction itself succeeded.
                          </p>
                        )}
                      </>
                    ) : (
                      <p>
                        This transaction called a function that couldn't be decoded or isn't directly related to
                        locking/unlocking.
                      </p>
                    )}

                    {txDetails.status === "Success" ? (
                      <p>
                        The transaction was successful at the blockchain level, but this doesn't guarantee that the
                        contract operation (lock/unlock) completed as expected. Check the events to confirm.
                      </p>
                    ) : (
                      <p>The transaction failed at the blockchain level. No state changes would have occurred.</p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-sm font-medium">Next Steps</p>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
                    <li>Check if the lock amount matches what you expected</li>
                    <li>Verify that the lock period is correct</li>
                    <li>
                      Use the Lock Relationship Analyzer to see if the lock is properly recorded in both contracts
                    </li>
                    <li>
                      If the lock exists but isn't showing in the UI, there might be an issue with how the UI retrieves
                      lock data
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="p-4 bg-muted rounded-md text-center">
                <p className="text-sm text-muted-foreground">
                  {loading ? "Analyzing transaction..." : "Enter a transaction hash to see the analysis"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

