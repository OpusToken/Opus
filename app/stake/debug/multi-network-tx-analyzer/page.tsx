"use client"

import type React from "react"

import { useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Networks configuration
const NETWORKS = {
  ethereum: {
    name: "Ethereum",
    rpcUrls: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth", "https://ethereum.publicnode.com"],
    chainId: 1,
    blockExplorerUrl: "https://etherscan.io",
  },
  pulsechain: {
    name: "PulseChain",
    rpcUrls: ["https://rpc.pulsechain.com", "https://pulsechain.publicnode.com", "https://rpc-pulsechain.g4mm4.io"],
    chainId: 369,
    blockExplorerUrl: "https://scan.pulsechain.com",
  },
  bsc: {
    name: "Binance Smart Chain",
    rpcUrls: [
      "https://bsc-dataseed.binance.org",
      "https://bsc-dataseed1.defibit.io",
      "https://bsc-dataseed1.ninicoin.io",
    ],
    chainId: 56,
    blockExplorerUrl: "https://bscscan.com",
  },
  polygon: {
    name: "Polygon",
    rpcUrls: [
      "https://polygon-rpc.com",
      "https://rpc-mainnet.matic.network",
      "https://matic-mainnet.chainstacklabs.com",
    ],
    chainId: 137,
    blockExplorerUrl: "https://polygonscan.com",
  },
  arbitrum: {
    name: "Arbitrum",
    rpcUrls: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum-one.public.blastapi.io",
      "https://arbitrum.llamarpc.com",
    ],
    chainId: 42161,
    blockExplorerUrl: "https://arbiscan.io",
  },
  optimism: {
    name: "Optimism",
    rpcUrls: [
      "https://mainnet.optimism.io",
      "https://optimism-mainnet.public.blastapi.io",
      "https://optimism.llamarpc.com",
    ],
    chainId: 10,
    blockExplorerUrl: "https://optimistic.etherscan.io",
  },
  base: {
    name: "Base",
    rpcUrls: ["https://mainnet.base.org", "https://base.llamarpc.com", "https://base-mainnet.public.blastapi.io"],
    chainId: 8453,
    blockExplorerUrl: "https://basescan.org",
  },
}

// Common ABIs for decoding
const COMMON_ABIS = {
  ERC20: [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
  ],
  STAKING: [
    "function stake(uint256 amount) returns (bool)",
    "function unstake(uint256 amount) returns (bool)",
    "function withdraw(uint256 amount) returns (bool)",
    "function getReward() returns (bool)",
    "function exit() returns (bool)",
    "function lock(uint256 amount, uint256 duration) returns (bool)",
    "function unlock(uint256 lockId) returns (bool)",
    "function claimRewards() returns (bool)",
    "event Staked(address indexed user, uint256 amount)",
    "event Withdrawn(address indexed user, uint256 amount)",
    "event RewardPaid(address indexed user, uint256 reward)",
    "event Locked(address indexed user, uint256 amount, uint256 duration, uint256 lockId)",
    "event Unlocked(address indexed user, uint256 amount, uint256 lockId)",
  ],
}

// Function to get a working provider for a network
const getWorkingProvider = async (networkKey: string) => {
  const network = NETWORKS[networkKey as keyof typeof NETWORKS]
  if (!network) {
    throw new Error(`Network ${networkKey} not supported`)
  }

  // Try each RPC URL until one works
  for (const rpcUrl of network.rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      // Test the provider with a simple call
      await provider.getBlockNumber()
      console.log(`Using RPC: ${rpcUrl} for ${network.name}`)
      return provider
    } catch (error) {
      console.warn(`RPC ${rpcUrl} failed, trying next...`)
    }
  }

  // If all fail, throw an error
  throw new Error(`All RPC endpoints for ${network.name} failed. Please try again later.`)
}

// Function to detect which network a transaction is on
const detectNetwork = async (txHash: string) => {
  console.log(`Attempting to detect network for transaction: ${txHash}`)

  // Try each network
  for (const [key, network] of Object.entries(NETWORKS)) {
    try {
      console.log(`Checking ${network.name}...`)
      const provider = await getWorkingProvider(key)
      const tx = await provider.getTransaction(txHash)

      if (tx) {
        console.log(`Transaction found on ${network.name}`)
        return key
      }
    } catch (error) {
      console.log(`Transaction not found on ${network.name}`)
    }
  }

  return null
}

// Function to get transaction details
const getTransactionDetails = async (txHash: string, networkKey: string) => {
  try {
    const provider = await getWorkingProvider(networkKey)
    const tx = await provider.getTransaction(txHash)

    if (!tx) {
      throw new Error("Transaction not found")
    }

    const receipt = await provider.getTransactionReceipt(txHash)
    const block = await provider.getBlock(tx.blockNumber || 0)

    return {
      tx,
      receipt,
      block,
      provider,
    }
  } catch (error) {
    console.error("Error getting transaction details:", error)
    throw error
  }
}

// Function to decode transaction input data
const decodeTransactionInput = (data: string) => {
  try {
    // First, try to identify the function signature
    const functionSignature = data.slice(0, 10)
    console.log("Function signature:", functionSignature)

    // Common function signatures for staking operations
    const commonSignatures: Record<string, { name: string; params: string[] }> = {
      "0xa694fc3a": { name: "stake(uint256)", params: ["uint256"] },
      "0x2e1a7d4d": { name: "withdraw(uint256)", params: ["uint256"] },
      "0x3d18b912": { name: "getReward()", params: [] },
      "0xe9fad8ee": { name: "exit()", params: [] },
      "0xdd467064": { name: "lock(uint256,uint256)", params: ["uint256", "uint256"] },
      "0x2f865c78": { name: "unlock(uint256)", params: ["uint256"] },
      "0x372500ab": { name: "claimRewards()", params: [] },
      "0x095ea7b3": { name: "approve(address,uint256)", params: ["address", "uint256"] },
      "0xa9059cbb": { name: "transfer(address,uint256)", params: ["address", "uint256"] },
      "0x23b872dd": { name: "transferFrom(address,address,uint256)", params: ["address", "address", "uint256"] },
    }

    if (commonSignatures[functionSignature]) {
      const { name, params } = commonSignatures[functionSignature]

      // If there are no parameters, return just the function name
      if (params.length === 0) {
        return {
          function: name,
          params: [],
        }
      }

      // Decode parameters
      try {
        const abiCoder = new ethers.AbiCoder()
        const decodedParams = abiCoder.decode(params, "0x" + data.slice(10))

        return {
          function: name,
          params: decodedParams,
        }
      } catch (error) {
        console.error("Error decoding parameters:", error)
        return {
          function: name,
          params: ["Unable to decode parameters"],
        }
      }
    }

    // If we couldn't identify the function signature
    return {
      function: "Unknown function",
      params: ["Raw data: " + data],
    }
  } catch (error) {
    console.error("Error decoding transaction input:", error)
    return {
      function: "Error decoding",
      params: ["Error: " + (error as Error).message],
    }
  }
}

// Function to decode transaction logs
const decodeTransactionLogs = (logs: any[], provider: ethers.Provider) => {
  try {
    // Create interfaces for common contracts
    const erc20Interface = new ethers.Interface(COMMON_ABIS.ERC20)
    const stakingInterface = new ethers.Interface(COMMON_ABIS.STAKING)

    return logs.map((log) => {
      try {
        // Try to decode with ERC20 interface
        try {
          const decodedLog = erc20Interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          })

          if (decodedLog) {
            return {
              address: log.address,
              event: decodedLog.name,
              args: decodedLog.args,
              decoded: true,
            }
          }
        } catch (e) {
          // Not an ERC20 event, try staking interface
        }

        // Try to decode with Staking interface
        try {
          const decodedLog = stakingInterface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          })

          if (decodedLog) {
            return {
              address: log.address,
              event: decodedLog.name,
              args: decodedLog.args,
              decoded: true,
            }
          }
        } catch (e) {
          // Not a staking event either
        }

        // If we couldn't decode the log
        return {
          address: log.address,
          topics: log.topics,
          data: log.data,
          decoded: false,
        }
      } catch (error) {
        console.error("Error decoding log:", error)
        return {
          address: log.address,
          topics: log.topics,
          data: log.data,
          error: (error as Error).message,
          decoded: false,
        }
      }
    })
  } catch (error) {
    console.error("Error decoding transaction logs:", error)
    return []
  }
}

export default function MultiNetworkTxAnalyzer() {
  const [txHash1, setTxHash1] = useState("")
  const [txHash2, setTxHash2] = useState("")
  const [network1, setNetwork1] = useState("pulsechain")
  const [network2, setNetwork2] = useState("pulsechain")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txDetails1, setTxDetails1] = useState<any>(null)
  const [txDetails2, setTxDetails2] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("tx1")
  const [decodedInput1, setDecodedInput1] = useState<any>(null)
  const [decodedInput2, setDecodedInput2] = useState<any>(null)
  const [decodedLogs1, setDecodedLogs1] = useState<any[]>([])
  const [decodedLogs2, setDecodedLogs2] = useState<any[]>([])
  const [comparison, setComparison] = useState<any>(null)

  // Function to detect network for a transaction
  const handleDetectNetwork = async (txHash: string, setNetwork: (network: string) => void) => {
    setIsLoading(true)
    setError(null)

    try {
      const detectedNetwork = await detectNetwork(txHash)

      if (detectedNetwork) {
        setNetwork(detectedNetwork)
        return detectedNetwork
      } else {
        setError(`Could not find transaction ${txHash} on any supported network`)
        return null
      }
    } catch (error) {
      setError(`Error detecting network: ${(error as Error).message}`)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Function to analyze a single transaction
  const analyzeTx = async (
    txHash: string,
    networkKey: string,
    setTxDetails: (details: any) => void,
    setDecodedInput: (input: any) => void,
    setDecodedLogs: (logs: any[]) => void,
  ) => {
    try {
      const details = await getTransactionDetails(txHash, networkKey)
      setTxDetails(details)

      // Decode input data
      const decodedInput = decodeTransactionInput(details.tx.data)
      setDecodedInput(decodedInput)

      // Decode logs
      if (details.receipt && details.receipt.logs) {
        const decodedLogs = decodeTransactionLogs(details.receipt.logs, details.provider)
        setDecodedLogs(decodedLogs)
      }

      return details
    } catch (error) {
      console.error("Error analyzing transaction:", error)
      setError(`Error analyzing transaction: ${(error as Error).message}`)
      return null
    }
  }

  // Function to compare two transactions
  const compareTxs = () => {
    if (!txDetails1 || !txDetails2 || !decodedInput1 || !decodedInput2) {
      setError("Cannot compare transactions: Missing transaction details")
      return
    }

    const comparison = {
      // Basic transaction info comparison
      basic: {
        from: txDetails1.tx.from === txDetails2.tx.from,
        to: txDetails1.tx.to === txDetails2.tx.to,
        value: txDetails1.tx.value === txDetails2.tx.value,
      },

      // Function call comparison
      function: {
        same: decodedInput1.function === decodedInput2.function,
        tx1: decodedInput1.function,
        tx2: decodedInput2.function,
      },

      // Parameter comparison
      params: {
        sameCount: decodedInput1.params.length === decodedInput2.params.length,
        tx1Params: decodedInput1.params,
        tx2Params: decodedInput2.params,
      },

      // Status comparison
      status: {
        tx1Success: txDetails1.receipt?.status === 1,
        tx2Success: txDetails2.receipt?.status === 1,
        bothSuccessful: txDetails1.receipt?.status === 1 && txDetails2.receipt?.status === 1,
      },

      // Logs comparison
      logs: {
        tx1Count: decodedLogs1.length,
        tx2Count: decodedLogs2.length,
        sameCount: decodedLogs1.length === decodedLogs2.length,

        // Compare events
        events: {
          tx1Events: decodedLogs1.filter((log) => log.decoded).map((log) => log.event),
          tx2Events: decodedLogs2.filter((log) => log.decoded).map((log) => log.event),
        },
      },
    }

    setComparison(comparison)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setTxDetails1(null)
    setTxDetails2(null)
    setDecodedInput1(null)
    setDecodedInput2(null)
    setDecodedLogs1([])
    setDecodedLogs2([])
    setComparison(null)

    try {
      // Analyze first transaction
      const details1 = await analyzeTx(txHash1, network1, setTxDetails1, setDecodedInput1, setDecodedLogs1)

      // Analyze second transaction if provided
      let details2 = null
      if (txHash2) {
        details2 = await analyzeTx(txHash2, network2, setTxDetails2, setDecodedInput2, setDecodedLogs2)
      }

      // Compare transactions if both were analyzed successfully
      if (details1 && details2) {
        compareTxs()
      }

      // Switch to the appropriate tab
      if (details1 && details2) {
        setActiveTab("comparison")
      } else if (details1) {
        setActiveTab("tx1")
      }
    } catch (error) {
      setError(`Error analyzing transactions: ${(error as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  // Format value for display
  const formatValue = (value: bigint) => {
    return ethers.formatEther(value)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Multi-Network Transaction Analyzer</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Analysis</CardTitle>
          <CardDescription>
            Enter transaction hashes to analyze and compare transactions across different networks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="txHash1">Transaction Hash 1</Label>
              <div className="flex space-x-2">
                <Input
                  id="txHash1"
                  value={txHash1}
                  onChange={(e) => setTxHash1(e.target.value)}
                  placeholder="0x..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDetectNetwork(txHash1, setNetwork1)}
                  disabled={!txHash1 || isLoading}
                >
                  Find Network
                </Button>
              </div>
              <div className="flex space-x-2 items-center">
                <Label htmlFor="network1" className="w-24">
                  Network:
                </Label>
                <Select value={network1} onValueChange={setNetwork1}>
                  <SelectTrigger id="network1" className="flex-1">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NETWORKS).map(([key, network]) => (
                      <SelectItem key={key} value={key}>
                        {network.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="txHash2">Transaction Hash 2 (Optional for Comparison)</Label>
              <div className="flex space-x-2">
                <Input
                  id="txHash2"
                  value={txHash2}
                  onChange={(e) => setTxHash2(e.target.value)}
                  placeholder="0x..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDetectNetwork(txHash2, setNetwork2)}
                  disabled={!txHash2 || isLoading}
                >
                  Find Network
                </Button>
              </div>
              <div className="flex space-x-2 items-center">
                <Label htmlFor="network2" className="w-24">
                  Network:
                </Label>
                <Select value={network2} onValueChange={setNetwork2}>
                  <SelectTrigger id="network2" className="flex-1">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NETWORKS).map(([key, network]) => (
                      <SelectItem key={key} value={key}>
                        {network.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={!txHash1 || isLoading} className="w-full">
              {isLoading ? "Analyzing..." : txHash2 ? "Compare Transactions" : "Analyze Transaction"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(txDetails1 || txDetails2) && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="tx1" disabled={!txDetails1}>
              Transaction 1
            </TabsTrigger>
            <TabsTrigger value="tx2" disabled={!txDetails2}>
              Transaction 2
            </TabsTrigger>
            <TabsTrigger value="comparison" disabled={!txDetails1 || !txDetails2}>
              Comparison
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tx1">
            {txDetails1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction 1 Details</CardTitle>
                  <CardDescription>Network: {NETWORKS[network1 as keyof typeof NETWORKS]?.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">Hash:</span> {txDetails1.tx.hash}
                        </p>
                        <p>
                          <span className="font-medium">From:</span> {txDetails1.tx.from}
                        </p>
                        <p>
                          <span className="font-medium">To:</span> {txDetails1.tx.to}
                        </p>
                        <p>
                          <span className="font-medium">Value:</span> {formatValue(txDetails1.tx.value)} ETH
                        </p>
                        <p>
                          <span className="font-medium">Block:</span> {txDetails1.tx.blockNumber?.toString()}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {txDetails1.receipt?.status === 1 ? (
                            <span className="text-green-500 font-medium">Success</span>
                          ) : (
                            <span className="text-red-500 font-medium">Failed</span>
                          )}
                        </p>
                        <p>
                          <span className="font-medium">Timestamp:</span>{" "}
                          {txDetails1.block ? formatTimestamp(txDetails1.block.timestamp) : "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Gas Used:</span>{" "}
                          {txDetails1.receipt?.gasUsed.toString() || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Function Call</h3>
                      {decodedInput1 && (
                        <div className="space-y-1">
                          <p>
                            <span className="font-medium">Function:</span> {decodedInput1.function}
                          </p>
                          <div>
                            <p className="font-medium">Parameters:</p>
                            <ul className="list-disc pl-5">
                              {decodedInput1.params.map((param: any, index: number) => (
                                <li key={index}>
                                  {typeof param === "object" && param !== null
                                    ? JSON.stringify(param)
                                    : param.toString()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Events</h3>
                    {decodedLogs1.length > 0 ? (
                      <div className="space-y-4">
                        {decodedLogs1.map((log, index) => (
                          <div key={index} className="p-3 border rounded-md">
                            {log.decoded ? (
                              <>
                                <p>
                                  <span className="font-medium">Event:</span> {log.event}
                                </p>
                                <p>
                                  <span className="font-medium">Contract:</span> {formatAddress(log.address)}
                                </p>
                                <div>
                                  <p className="font-medium">Arguments:</p>
                                  <ul className="list-disc pl-5">
                                    {Object.entries(log.args || {}).map(([key, value]: [string, any]) => (
                                      <li key={key}>
                                        {key}: {typeof value === "object" ? JSON.stringify(value) : value.toString()}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            ) : (
                              <>
                                <p>
                                  <span className="font-medium">Contract:</span> {formatAddress(log.address)}
                                </p>
                                <p>
                                  <span className="font-medium">Data:</span> {log.data}
                                </p>
                                <div>
                                  <p className="font-medium">Topics:</p>
                                  <ul className="list-disc pl-5">
                                    {log.topics.map((topic: string, i: number) => (
                                      <li key={i}>{topic}</li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No events emitted</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tx2">
            {txDetails2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction 2 Details</CardTitle>
                  <CardDescription>Network: {NETWORKS[network2 as keyof typeof NETWORKS]?.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">Hash:</span> {txDetails2.tx.hash}
                        </p>
                        <p>
                          <span className="font-medium">From:</span> {txDetails2.tx.from}
                        </p>
                        <p>
                          <span className="font-medium">To:</span> {txDetails2.tx.to}
                        </p>
                        <p>
                          <span className="font-medium">Value:</span> {formatValue(txDetails2.tx.value)} ETH
                        </p>
                        <p>
                          <span className="font-medium">Block:</span> {txDetails2.tx.blockNumber?.toString()}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {txDetails2.receipt?.status === 1 ? (
                            <span className="text-green-500 font-medium">Success</span>
                          ) : (
                            <span className="text-red-500 font-medium">Failed</span>
                          )}
                        </p>
                        <p>
                          <span className="font-medium">Timestamp:</span>{" "}
                          {txDetails2.block ? formatTimestamp(txDetails2.block.timestamp) : "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Gas Used:</span>{" "}
                          {txDetails2.receipt?.gasUsed.toString() || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Function Call</h3>
                      {decodedInput2 && (
                        <div className="space-y-1">
                          <p>
                            <span className="font-medium">Function:</span> {decodedInput2.function}
                          </p>
                          <div>
                            <p className="font-medium">Parameters:</p>
                            <ul className="list-disc pl-5">
                              {decodedInput2.params.map((param: any, index: number) => (
                                <li key={index}>
                                  {typeof param === "object" && param !== null
                                    ? JSON.stringify(param)
                                    : param.toString()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Events</h3>
                    {decodedLogs2.length > 0 ? (
                      <div className="space-y-4">
                        {decodedLogs2.map((log, index) => (
                          <div key={index} className="p-3 border rounded-md">
                            {log.decoded ? (
                              <>
                                <p>
                                  <span className="font-medium">Event:</span> {log.event}
                                </p>
                                <p>
                                  <span className="font-medium">Contract:</span> {formatAddress(log.address)}
                                </p>
                                <div>
                                  <p className="font-medium">Arguments:</p>
                                  <ul className="list-disc pl-5">
                                    {Object.entries(log.args || {}).map(([key, value]: [string, any]) => (
                                      <li key={key}>
                                        {key}: {typeof value === "object" ? JSON.stringify(value) : value.toString()}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            ) : (
                              <>
                                <p>
                                  <span className="font-medium">Contract:</span> {formatAddress(log.address)}
                                </p>
                                <p>
                                  <span className="font-medium">Data:</span> {log.data}
                                </p>
                                <div>
                                  <p className="font-medium">Topics:</p>
                                  <ul className="list-disc pl-5">
                                    {log.topics.map((topic: string, i: number) => (
                                      <li key={i}>{topic}</li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No events emitted</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comparison">
            {comparison && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Comparison</CardTitle>
                  <CardDescription>
                    Comparing transactions on {NETWORKS[network1 as keyof typeof NETWORKS]?.name} and{" "}
                    {NETWORKS[network2 as keyof typeof NETWORKS]?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Function Call Comparison</h3>
                    <div className="p-3 border rounded-md">
                      <div className="flex items-center mb-2">
                        <span className="font-medium mr-2">Same Function:</span>
                        {comparison.function.same ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">Transaction 1 Function:</p>
                          <p>{comparison.function.tx1}</p>
                        </div>
                        <div>
                          <p className="font-medium">Transaction 2 Function:</p>
                          <p>{comparison.function.tx2}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Parameter Comparison</h3>
                    <div className="p-3 border rounded-md">
                      <div className="flex items-center mb-2">
                        <span className="font-medium mr-2">Same Parameter Count:</span>
                        {comparison.params.sameCount ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">Transaction 1 Parameters:</p>
                          <ul className="list-disc pl-5">
                            {comparison.params.tx1Params.map((param: any, index: number) => (
                              <li key={index}>
                                {typeof param === "object" && param !== null ? JSON.stringify(param) : param.toString()}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">Transaction 2 Parameters:</p>
                          <ul className="list-disc pl-5">
                            {comparison.params.tx2Params.map((param: any, index: number) => (
                              <li key={index}>
                                {typeof param === "object" && param !== null ? JSON.stringify(param) : param.toString()}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Status Comparison</h3>
                    <div className="p-3 border rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">Transaction 1 Status:</p>
                          {comparison.status.tx1Success ? (
                            <p className="text-green-500">Success</p>
                          ) : (
                            <p className="text-red-500">Failed</p>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">Transaction 2 Status:</p>
                          {comparison.status.tx2Success ? (
                            <p className="text-green-500">Success</p>
                          ) : (
                            <p className="text-red-500">Failed</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Event Comparison</h3>
                    <div className="p-3 border rounded-md">
                      <div className="flex items-center mb-2">
                        <span className="font-medium mr-2">Same Event Count:</span>
                        {comparison.logs.sameCount ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">Transaction 1 Events ({comparison.logs.tx1Count}):</p>
                          <ul className="list-disc pl-5">
                            {comparison.logs.events.tx1Events.map((event: string, index: number) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">Transaction 2 Events ({comparison.logs.tx2Count}):</p>
                          <ul className="list-disc pl-5">
                            {comparison.logs.events.tx2Events.map((event: string, index: number) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Analysis Summary</h3>
                    <p className="text-yellow-800">
                      {comparison.function.same
                        ? "Both transactions call the same function."
                        : "Transactions call different functions, which may explain different behaviors."}
                    </p>
                    <p className="text-yellow-800 mt-2">
                      {comparison.status.bothSuccessful
                        ? "Both transactions were successful on-chain."
                        : "At least one transaction failed on-chain, check the status comparison for details."}
                    </p>
                    <p className="text-yellow-800 mt-2">
                      {comparison.logs.sameCount &&
                      comparison.logs.events.tx1Events.join() === comparison.logs.events.tx2Events.join()
                        ? "Both transactions emitted the same events, suggesting similar behavior."
                        : "Transactions emitted different events, which may indicate different processing paths."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

