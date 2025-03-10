"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { STAKING_CONTRACT_ABI, OPUS_TOKEN_ABI } from "@/lib/contracts"

// Common ABIs for decoding
const COMMON_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
]

const COMMON_STAKING_ABI = [
  // Basic staking functions
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function deposit(uint256 amount) external",

  // Locking functions
  "function lock(uint256 amount, uint256 period) external",
  "function unlock(uint256[] lockID) external",
  "function claimRewards() external",
  "function claim() external",

  // Events
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event RewardPaid(address indexed user, uint256 reward)",
  "event LockToken(address indexed user, uint256 amount, uint256 period)",
  "event UnLockToken(address indexed user, uint256 amount)",
  "event Lock(address indexed user, uint256 amount, uint256 period)",
  "event Unlock(address indexed user, uint256 amount)",
]

// RPC URLs for different networks
const RPC_URLS = {
  pulsechain: ["https://rpc.pulsechain.com", "https://pulsechain.publicnode.com", "https://rpc-pulsechain.g4mm4.io"],
  ethereum: ["https://eth.llamarpc.com", "https://ethereum.publicnode.com"],
  bsc: ["https://bsc-dataseed.binance.org", "https://bsc-dataseed1.defibit.io"],
  polygon: ["https://polygon-rpc.com", "https://polygon.llamarpc.com"],
  arbitrum: ["https://arb1.arbitrum.io/rpc", "https://arbitrum.llamarpc.com"],
  optimism: ["https://mainnet.optimism.io", "https://optimism.llamarpc.com"],
  avalanche: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche-c-chain.publicnode.com"],
}

export default function TxComparisonPage() {
  const [txHash1, setTxHash1] = useState("")
  const [txHash2, setTxHash2] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tx1Details, setTx1Details] = useState<any>(null)
  const [tx2Details, setTx2Details] = useState<any>(null)
  const [comparisonResults, setComparisonResults] = useState<any>(null)

  // Get a working provider for a network
  const getWorkingProvider = async (network: string) => {
    const urls = RPC_URLS[network as keyof typeof RPC_URLS] || RPC_URLS.pulsechain

    for (const url of urls) {
      try {
        const provider = new ethers.JsonRpcProvider(url)
        // Test the provider
        await provider.getBlockNumber()
        return provider
      } catch (error) {
        console.warn(`RPC ${url} failed, trying next...`)
      }
    }

    throw new Error(`All ${network} RPC endpoints failed`)
  }

  // Try to find a transaction on multiple networks
  const findTransaction = async (txHash: string) => {
    const networks = Object.keys(RPC_URLS)

    for (const network of networks) {
      try {
        const provider = await getWorkingProvider(network)
        const tx = await provider.getTransaction(txHash)

        if (tx) {
          console.log(`Transaction found on ${network}`)
          return { provider, tx, network }
        }
      } catch (error) {
        console.warn(`Failed to find transaction on ${network}:`, error)
      }
    }

    throw new Error("Transaction not found on any supported network")
  }

  // Analyze a transaction
  const analyzeTransaction = async (txHash: string) => {
    try {
      // Find the transaction
      const { provider, tx, network } = await findTransaction(txHash)

      // Get receipt and block
      const receipt = await provider.getTransactionReceipt(txHash)
      const block = await provider.getBlock(receipt.blockNumber)

      // Format the transaction details
      const details: any = {
        hash: tx.hash,
        network,
        blockNumber: receipt.blockNumber,
        blockTime: block ? new Date(Number(block.timestamp) * 1000).toLocaleString() : "Unknown",
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value || 0),
        gasUsed: receipt.gasUsed?.toString() || "Unknown",
        status: receipt.status === 1 ? "Success" : "Failed",
        data: tx.data,
        logs: receipt.logs || [],
      }

      // Try to decode the input data
      try {
        // Create interfaces for common contracts
        const tokenInterface = new ethers.Interface(COMMON_TOKEN_ABI)
        const stakingInterface = new ethers.Interface([...COMMON_STAKING_ABI, ...STAKING_CONTRACT_ABI])

        // Try to decode with both interfaces
        let decoded

        try {
          decoded = tokenInterface.parseTransaction({ data: tx.data, value: tx.value })
          details.contract = "Token Contract"
        } catch {
          try {
            decoded = stakingInterface.parseTransaction({ data: tx.data, value: tx.value })
            details.contract = "Staking Contract"
          } catch {
            details.contract = "Unknown"
          }
        }

        if (decoded) {
          details.decodedInput = {
            name: decoded.name,
            args: decoded.args.map((arg) => arg.toString()),
          }
        }
      } catch (err) {
        console.warn("Failed to decode input data:", err)
      }

      // Try to decode the logs
      try {
        const tokenInterface = new ethers.Interface([...COMMON_TOKEN_ABI, ...OPUS_TOKEN_ABI])
        const stakingInterface = new ethers.Interface([...COMMON_STAKING_ABI, ...STAKING_CONTRACT_ABI])

        const decodedLogs = receipt.logs.map((log) => {
          try {
            let decodedLog

            // Try to decode with token interface
            try {
              decodedLog = tokenInterface.parseLog({ topics: log.topics as string[], data: log.data })
            } catch {
              // Try to decode with staking interface
              try {
                decodedLog = stakingInterface.parseLog({ topics: log.topics as string[], data: log.data })
              } catch {
                // Unable to decode
                return {
                  address: log.address,
                  name: "Unknown",
                  args: [],
                  raw: log,
                }
              }
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

        details.decodedLogs = decodedLogs
      } catch (err) {
        console.warn("Failed to decode logs:", err)
      }

      return details
    } catch (err: any) {
      console.error("Error analyzing transaction:", err)
      throw new Error(err.message || "Failed to analyze transaction")
    }
  }

  // Compare two transactions
  const compareTransactions = async () => {
    if (!txHash1 || !txHash2) {
      setError("Please enter both transaction hashes")
      return
    }

    setLoading(true)
    setError(null)
    setTx1Details(null)
    setTx2Details(null)
    setComparisonResults(null)

    try {
      // Analyze both transactions
      const [details1, details2] = await Promise.all([analyzeTransaction(txHash1), analyzeTransaction(txHash2)])

      setTx1Details(details1)
      setTx2Details(details2)

      // Compare the transactions
      const comparison = {
        sameContract: details1.to?.toLowerCase() === details2.to?.toLowerCase(),
        sameFunction: details1.decodedInput?.name === details2.decodedInput?.name,
        sameArgCount: details1.decodedInput?.args?.length === details2.decodedInput?.args?.length,
        sameEventCount: details1.decodedLogs?.length === details2.decodedLogs?.length,
        commonEvents: [] as string[],
        missingEvents: [] as string[],
        additionalEvents: [] as string[],
        differences: [] as string[],
      }

      // Compare events
      if (details1.decodedLogs && details2.decodedLogs) {
        const events1 = details1.decodedLogs.map((log: any) => log.name)
        const events2 = details2.decodedLogs.map((log: any) => log.name)

        // Find common events
        comparison.commonEvents = events1.filter((event: string) => events2.includes(event) && event !== "Unknown")

        // Find events in tx1 but not in tx2
        comparison.missingEvents = events1.filter((event: string) => !events2.includes(event) && event !== "Unknown")

        // Find events in tx2 but not in tx1
        comparison.additionalEvents = events2.filter((event: string) => !events1.includes(event) && event !== "Unknown")
      }

      // Check for key differences
      const differences = []

      if (!comparison.sameFunction) {
        differences.push(
          `Different functions called: ${details1.decodedInput?.name || "Unknown"} vs ${details2.decodedInput?.name || "Unknown"}`,
        )
      }

      if (!comparison.sameArgCount) {
        differences.push(
          `Different number of arguments: ${details1.decodedInput?.args?.length || 0} vs ${details2.decodedInput?.args?.length || 0}`,
        )
      }

      if (comparison.missingEvents.length > 0) {
        differences.push(`Events in TX1 but missing in TX2: ${comparison.missingEvents.join(", ")}`)
      }

      if (comparison.additionalEvents.length > 0) {
        differences.push(`Events in TX2 but missing in TX1: ${comparison.additionalEvents.join(", ")}`)
      }

      comparison.differences = differences

      setComparisonResults(comparison)

      toast({
        title: "Transactions Compared",
        description: "Successfully compared both transactions",
      })
    } catch (err: any) {
      console.error("Error comparing transactions:", err)
      setError(err.message || "Failed to compare transactions")

      toast({
        title: "Error",
        description: err.message || "Failed to compare transactions",
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

  // Set OPUS unlock transaction
  const setOpusUnlockTx = () => {
    // Replace with your actual OPUS unlock transaction hash
    setTxHash1("0xc3a9ae0e8395f4c75a5cd6550edc2a02ec757c69c106637ff9230b094b049ab7")
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Transaction Comparison</h1>
      <p className="text-muted-foreground mb-6">Compare two transactions to understand differences in behavior</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Hashes</CardTitle>
          <CardDescription>Enter two transaction hashes to compare</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              <Input
                value={txHash1}
                onChange={(e) => setTxHash1(e.target.value)}
                placeholder="Transaction 1 Hash (0x...)"
                className="flex-grow"
              />
              <Button variant="outline" onClick={setOpusUnlockTx}>
                Use OPUS Tx
              </Button>
            </div>

            <div className="flex space-x-2">
              <Input
                value={txHash2}
                onChange={(e) => setTxHash2(e.target.value)}
                placeholder="Transaction 2 Hash (0x...)"
                className="flex-grow"
              />
            </div>

            <Button onClick={compareTransactions} disabled={loading || !txHash1 || !txHash2} className="w-full">
              {loading ? "Analyzing..." : "Compare Transactions"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {(tx1Details || tx2Details) && (
        <Tabs defaultValue="comparison" className="w-full mb-6">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="tx1">Transaction 1</TabsTrigger>
            <TabsTrigger value="tx2">Transaction 2</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Comparison Results</CardTitle>
                <CardDescription>Differences between the two transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonResults ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium">Transaction 1</p>
                        <p className="text-xs text-muted-foreground">{formatAddress(tx1Details.hash)}</p>
                        <p className="text-xs text-muted-foreground">Network: {tx1Details.network}</p>
                        <p className="text-xs text-muted-foreground">
                          Function: {tx1Details.decodedInput?.name || "Unknown"}
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium">Transaction 2</p>
                        <p className="text-xs text-muted-foreground">{formatAddress(tx2Details.hash)}</p>
                        <p className="text-xs text-muted-foreground">Network: {tx2Details.network}</p>
                        <p className="text-xs text-muted-foreground">
                          Function: {tx2Details.decodedInput?.name || "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <p className="text-sm font-medium text-blue-500">Key Findings</p>
                      <ul className="list-disc list-inside text-sm text-blue-500 mt-2">
                        <li>
                          {comparisonResults.sameContract
                            ? "Both transactions interact with the same contract"
                            : "Transactions interact with different contracts"}
                        </li>
                        <li>
                          {comparisonResults.sameFunction
                            ? `Both call the same function: ${tx1Details.decodedInput?.name || "Unknown"}`
                            : `Different functions called: ${tx1Details.decodedInput?.name || "Unknown"} vs ${tx2Details.decodedInput?.name || "Unknown"}`}
                        </li>
                        <li>
                          {comparisonResults.commonEvents.length > 0
                            ? `Common events: ${comparisonResults.commonEvents.join(", ")}`
                            : "No common events found"}
                        </li>
                      </ul>
                    </div>

                    {comparisonResults.differences.length > 0 && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                        <p className="text-sm font-medium text-yellow-500">Key Differences</p>
                        <ul className="list-disc list-inside text-sm text-yellow-500 mt-2">
                          {comparisonResults.differences.map((diff: string, index: number) => (
                            <li key={index}>{diff}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                      <p className="text-sm font-medium text-green-500">Recommendations</p>
                      <ul className="list-disc list-inside text-sm text-green-500 mt-2">
                        {comparisonResults.missingEvents.length > 0 && (
                          <li>
                            Check why Transaction 2 is missing these events:{" "}
                            {comparisonResults.missingEvents.join(", ")}
                          </li>
                        )}
                        {comparisonResults.additionalEvents.length > 0 && (
                          <li>
                            Transaction 2 has these additional events that might be required:{" "}
                            {comparisonResults.additionalEvents.join(", ")}
                          </li>
                        )}
                        {!comparisonResults.sameFunction && (
                          <li>The function names are different. Make sure you're calling the correct function.</li>
                        )}
                        {!comparisonResults.sameArgCount && (
                          <li>The number of arguments differs. Check if you're passing all required parameters.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No comparison results available yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tx1">
            <Card>
              <CardHeader>
                <CardTitle>Transaction 1 Details</CardTitle>
                <CardDescription>
                  {tx1Details
                    ? `Transaction ${formatAddress(tx1Details.hash)} on ${tx1Details.network}`
                    : "No transaction details available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tx1Details ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium">Transaction Hash</p>
                        <p className="text-sm break-all">{tx1Details.hash}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Status</p>
                        <p className={`text-sm ${tx1Details.status === "Success" ? "text-green-500" : "text-red-500"}`}>
                          {tx1Details.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Block</p>
                        <p className="text-sm">{tx1Details.blockNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Time</p>
                        <p className="text-sm">{tx1Details.blockTime}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">From</p>
                        <p className="text-sm">{formatAddress(tx1Details.from)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">To</p>
                        <p className="text-sm">
                          {formatAddress(tx1Details.to)}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({tx1Details.contract || "Unknown Contract"})
                          </span>
                        </p>
                      </div>
                    </div>

                    {tx1Details.decodedInput && (
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium">Function Called</p>
                        <p className="text-sm font-mono">{tx1Details.decodedInput.name}</p>
                        <div className="mt-2 space-y-2">
                          {tx1Details.decodedInput.args.map((arg: string, index: number) => (
                            <div key={index}>
                              <p className="text-xs text-muted-foreground">Parameter {index + 1}</p>
                              <p className="text-sm break-all">{arg}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tx1Details.decodedLogs && tx1Details.decodedLogs.length > 0 && (
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium">Events Emitted</p>
                        <div className="mt-2 space-y-2">
                          {tx1Details.decodedLogs.map((log: any, index: number) => (
                            <div key={index} className="p-2 bg-muted/50 rounded-md">
                              <div className="flex justify-between">
                                <p className="text-sm font-mono">{log.name}</p>
                                <p className="text-xs text-muted-foreground">{formatAddress(log.address)}</p>
                              </div>
                              {log.args.length > 0 && (
                                <div className="mt-1 pl-2 border-l-2 border-muted-foreground/20">
                                  {log.args.map((arg: string, argIndex: number) => (
                                    <p key={argIndex} className="text-xs">
                                      <span className="text-muted-foreground">Arg {argIndex}:</span> {arg}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No transaction details available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tx2">
            <Card>
              <CardHeader>
                <CardTitle>Transaction 2 Details</CardTitle>
                <CardDescription>
                  {tx2Details
                    ? `Transaction ${formatAddress(tx2Details.hash)} on ${tx2Details.network}`
                    : "No transaction details available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tx2Details ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium">Transaction Hash</p>
                        <p className="text-sm break-all">{tx2Details.hash}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Status</p>
                        <p className={`text-sm ${tx2Details.status === "Success" ? "text-green-500" : "text-red-500"}`}>
                          {tx2Details.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Block</p>
                        <p className="text-sm">{tx2Details.blockNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Time</p>
                        <p className="text-sm">{tx2Details.blockTime}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">From</p>
                        <p className="text-sm">{formatAddress(tx2Details.from)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">To</p>
                        <p className="text-sm">
                          {formatAddress(tx2Details.to)}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({tx2Details.contract || "Unknown Contract"})
                          </span>
                        </p>
                      </div>
                    </div>

                    {tx2Details.decodedInput && (
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium">Function Called</p>
                        <p className="text-sm font-mono">{tx2Details.decodedInput.name}</p>
                        <div className="mt-2 space-y-2">
                          {tx2Details.decodedInput.args.map((arg: string, index: number) => (
                            <div key={index}>
                              <p className="text-xs text-muted-foreground">Parameter {index + 1}</p>
                              <p className="text-sm break-all">{arg}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tx2Details.decodedLogs && tx2Details.decodedLogs.length > 0 && (
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium">Events Emitted</p>
                        <div className="mt-2 space-y-2">
                          {tx2Details.decodedLogs.map((log: any, index: number) => (
                            <div key={index} className="p-2 bg-muted/50 rounded-md">
                              <div className="flex justify-between">
                                <p className="text-sm font-mono">{log.name}</p>
                                <p className="text-xs text-muted-foreground">{formatAddress(log.address)}</p>
                              </div>
                              {log.args.length > 0 && (
                                <div className="mt-1 pl-2 border-l-2 border-muted-foreground/20">
                                  {log.args.map((arg: string, argIndex: number) => (
                                    <p key={argIndex} className="text-xs">
                                      <span className="text-muted-foreground">Arg {argIndex}:</span> {arg}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No transaction details available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Multi-Network Transaction Analyzer</CardTitle>
          <CardDescription>How this tool works</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This tool attempts to find and analyze transactions across multiple networks:
            </p>

            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>PulseChain</li>
              <li>Ethereum</li>
              <li>Binance Smart Chain</li>
              <li>Polygon</li>
              <li>Arbitrum</li>
              <li>Optimism</li>
              <li>Avalanche</li>
            </ul>

            <p className="text-sm text-muted-foreground">When you enter a transaction hash, the tool will:</p>

            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Try to find the transaction on each supported network</li>
              <li>Decode the function call and parameters</li>
              <li>Decode all events emitted during the transaction</li>
              <li>Compare two transactions to identify key differences</li>
            </ol>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-sm text-blue-500">
                <strong>Note:</strong> If the transaction hash you provided isn't found, try entering it manually to
                ensure there are no typos. This tool can help identify why your unlock transaction isn't working by
                comparing it with a successful unlock from a similar contract.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

