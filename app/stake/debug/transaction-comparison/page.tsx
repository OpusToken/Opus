"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, ArrowRightLeft } from "lucide-react"
import { ethers } from "ethers"

// List of RPC URLs to try
const RPC_URLS = {
  pulsechain: ["https://rpc.pulsechain.com", "https://pulsechain.publicnode.com", "https://rpc-pulsechain.g4mm4.io"],
  ethereum: ["https://eth.llamarpc.com", "https://ethereum.publicnode.com", "https://rpc.ankr.com/eth"],
  bsc: ["https://bsc-dataseed.binance.org", "https://bsc-dataseed1.defibit.io", "https://bsc-dataseed1.ninicoin.io"],
  polygon: ["https://polygon-rpc.com", "https://rpc-mainnet.matic.network", "https://matic-mainnet.chainstacklabs.com"],
}

// Common ABI fragments for decoding
const COMMON_ABI_FRAGMENTS = [
  "function unlock(uint256 lockId) external",
  "function unlock(uint256 nonce) external",
  "function unlock(uint256 lockId, bool claimRewards) external",
  "function unlock(uint256 lockId, address user) external",
  "event Unlock(address indexed user, uint256 indexed lockId, uint256 amount, bool penalized)",
  "event Unlock(address indexed user, uint256 indexed nonce, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]

export default function TransactionComparisonPage() {
  const [tx1Hash, setTx1Hash] = useState("")
  const [tx2Hash, setTx2Hash] = useState("")
  const [tx1Data, setTx1Data] = useState<any>(null)
  const [tx2Data, setTx2Data] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [network, setNetwork] = useState<string>("pulsechain")
  const [providers, setProviders] = useState<Record<string, ethers.JsonRpcProvider | null>>({
    pulsechain: null,
    ethereum: null,
    bsc: null,
    polygon: null,
  })

  // Initialize providers on component mount
  useEffect(() => {
    const initProviders = async () => {
      const newProviders: Record<string, ethers.JsonRpcProvider | null> = {
        pulsechain: null,
        ethereum: null,
        bsc: null,
        polygon: null,
      }

      // Try to initialize each provider
      for (const [networkName, urls] of Object.entries(RPC_URLS)) {
        for (const url of urls) {
          try {
            const provider = new ethers.JsonRpcProvider(url)
            // Test the provider with a simple call
            await provider.getBlockNumber()
            console.log(`Connected to ${networkName} using ${url}`)
            newProviders[networkName] = provider
            break // Stop trying URLs for this network once one works
          } catch (error) {
            console.warn(`Failed to connect to ${networkName} using ${url}`)
          }
        }
      }

      setProviders(newProviders)
    }

    initProviders()
  }, [])

  // Function to fetch transaction data
  const fetchTransactionData = async (txHash: string, networkName: string) => {
    if (!txHash || !networkName) {
      return null
    }

    const provider = providers[networkName]
    if (!provider) {
      throw new Error(`No provider available for ${networkName}`)
    }

    // Fetch transaction
    const tx = await provider.getTransaction(txHash)
    if (!tx) {
      throw new Error(`Transaction ${txHash} not found on ${networkName}`)
    }

    // Fetch transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash)

    // Fetch block information
    const block = await provider.getBlock(tx.blockNumber || 0)

    // Try to decode the transaction data
    let decodedInput = "Unable to decode input data"
    try {
      const iface = new ethers.Interface(COMMON_ABI_FRAGMENTS)
      decodedInput = iface.parseTransaction({ data: tx.data, value: tx.value })
    } catch (e) {
      console.warn("Failed to decode input:", e)
    }

    // Try to decode logs
    const decodedLogs = []
    if (receipt && receipt.logs) {
      const iface = new ethers.Interface(COMMON_ABI_FRAGMENTS)
      for (const log of receipt.logs) {
        try {
          const decoded = iface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          })
          decodedLogs.push({
            address: log.address,
            decoded,
            raw: log,
          })
        } catch (e) {
          decodedLogs.push({
            address: log.address,
            decoded: null,
            raw: log,
          })
        }
      }
    }

    return {
      hash: txHash,
      transaction: tx,
      receipt,
      block,
      decodedInput,
      decodedLogs,
      network: networkName,
    }
  }

  // Function to compare transactions
  const compareTransactions = async () => {
    setLoading(true)
    setError(null)
    setTx1Data(null)
    setTx2Data(null)

    try {
      // Fetch data for both transactions
      const data1Promise = fetchTransactionData(tx1Hash, network)
      const data2Promise = fetchTransactionData(tx2Hash, network)

      const [data1, data2] = await Promise.allSettled([data1Promise, data2Promise])

      // Handle the results
      if (data1.status === "fulfilled" && data1.value) {
        setTx1Data(data1.value)
      } else if (data1.status === "rejected") {
        console.error("Error fetching tx1:", data1.reason)
        setError(`Error fetching first transaction: ${data1.reason.message}`)
      }

      if (data2.status === "fulfilled" && data2.value) {
        setTx2Data(data2.value)
      } else if (data2.status === "rejected") {
        console.error("Error fetching tx2:", data2.reason)
        if (!error) {
          setError(`Error fetching second transaction: ${data2.reason.message}`)
        }
      }
    } catch (err: any) {
      console.error("Error comparing transactions:", err)
      setError(err.message || "An error occurred while comparing transactions")
    } finally {
      setLoading(false)
    }
  }

  // Function to try fetching a transaction from all networks
  const findTransactionNetwork = async (txHash: string) => {
    setLoading(true)
    setError(null)

    try {
      for (const [networkName, provider] of Object.entries(providers)) {
        if (!provider) continue

        try {
          console.log(`Checking ${networkName} for transaction ${txHash}...`)
          const tx = await provider.getTransaction(txHash)
          if (tx) {
            console.log(`Found transaction on ${networkName}!`)
            setNetwork(networkName)
            return networkName
          }
        } catch (e) {
          console.warn(`Transaction not found on ${networkName}`)
        }
      }

      setError(`Transaction ${txHash} not found on any network`)
      return null
    } catch (err: any) {
      console.error("Error finding transaction network:", err)
      setError(err.message || "An error occurred while searching for the transaction")
      return null
    } finally {
      setLoading(false)
    }
  }

  // Function to format an address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Function to format a timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  // Function to render transaction details
  const renderTransactionDetails = (data: any) => {
    if (!data) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm font-medium">Transaction Hash</p>
            <p className="text-sm font-mono break-all">{data.hash}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Network</p>
            <p className="text-sm">{data.network}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm font-medium">Block Number</p>
            <p className="text-sm">{data.transaction.blockNumber?.toString() || "Pending"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Timestamp</p>
            <p className="text-sm">{data.block ? formatTimestamp(data.block.timestamp) : "N/A"}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">From</p>
          <p className="text-sm font-mono">{data.transaction.from}</p>
        </div>

        <div>
          <p className="text-sm font-medium">To</p>
          <p className="text-sm font-mono">{data.transaction.to}</p>
        </div>

        <div>
          <p className="text-sm font-medium">Value</p>
          <p className="text-sm">{ethers.formatEther(data.transaction.value || 0)} ETH</p>
        </div>

        <div>
          <p className="text-sm font-medium">Gas Used</p>
          <p className="text-sm">{data.receipt ? data.receipt.gasUsed.toString() : "N/A"}</p>
        </div>

        <div>
          <p className="text-sm font-medium">Status</p>
          <p className="text-sm">{data.receipt ? (data.receipt.status === 1 ? "Success" : "Failed") : "Pending"}</p>
        </div>

        <div>
          <p className="text-sm font-medium">Decoded Input</p>
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
            <pre className="text-xs overflow-auto">
              {typeof data.decodedInput === "object" ? JSON.stringify(data.decodedInput, null, 2) : data.decodedInput}
            </pre>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Logs ({data.decodedLogs?.length || 0})</p>
          <div className="space-y-2">
            {data.decodedLogs?.map((log: any, index: number) => (
              <div key={index} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                <p className="text-xs font-medium">Contract: {formatAddress(log.address)}</p>
                {log.decoded ? (
                  <pre className="text-xs overflow-auto">{JSON.stringify(log.decoded, null, 2)}</pre>
                ) : (
                  <p className="text-xs">Unable to decode log</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Function to render transaction comparison
  const renderComparison = () => {
    if (!tx1Data || !tx2Data) return null

    // Compare function calls
    const functionComparison = {
      same: tx1Data.decodedInput?.name === tx2Data.decodedInput?.name,
      tx1: typeof tx1Data.decodedInput === "object" ? tx1Data.decodedInput?.name : "Unknown",
      tx2: typeof tx2Data.decodedInput === "object" ? tx2Data.decodedInput?.name : "Unknown",
    }

    // Compare arguments
    const argsComparison = {
      same: JSON.stringify(tx1Data.decodedInput?.args) === JSON.stringify(tx2Data.decodedInput?.args),
      tx1: typeof tx1Data.decodedInput === "object" ? tx1Data.decodedInput?.args : [],
      tx2: typeof tx2Data.decodedInput === "object" ? tx2Data.decodedInput?.args : [],
    }

    // Compare events
    const tx1Events = tx1Data.decodedLogs.filter((log: any) => log.decoded).map((log: any) => log.decoded.name)

    const tx2Events = tx2Data.decodedLogs.filter((log: any) => log.decoded).map((log: any) => log.decoded.name)

    const eventsComparison = {
      same: JSON.stringify(tx1Events) === JSON.stringify(tx2Events),
      tx1: tx1Events,
      tx2: tx2Events,
      tx1Only: tx1Events.filter((event: string) => !tx2Events.includes(event)),
      tx2Only: tx2Events.filter((event: string) => !tx1Events.includes(event)),
    }

    return (
      <div className="space-y-4">
        <Alert variant={functionComparison.same ? "default" : "destructive"}>
          <AlertTitle className="flex items-center">
            {functionComparison.same ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            Function Call
          </AlertTitle>
          <AlertDescription>
            {functionComparison.same
              ? `Both transactions call the same function: ${functionComparison.tx1}`
              : `Transactions call different functions: ${functionComparison.tx1} vs ${functionComparison.tx2}`}
          </AlertDescription>
        </Alert>

        <Alert variant={argsComparison.same ? "default" : "destructive"}>
          <AlertTitle className="flex items-center">
            {argsComparison.same ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
            Function Arguments
          </AlertTitle>
          <AlertDescription>
            {argsComparison.same ? "Both transactions use the same arguments" : "Transactions use different arguments"}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium">TX 1 Arguments:</p>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">
                  {JSON.stringify(argsComparison.tx1, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium">TX 2 Arguments:</p>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">
                  {JSON.stringify(argsComparison.tx2, null, 2)}
                </pre>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Alert variant={eventsComparison.same ? "default" : "destructive"}>
          <AlertTitle className="flex items-center">
            {eventsComparison.same ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            Emitted Events
          </AlertTitle>
          <AlertDescription>
            {eventsComparison.same ? "Both transactions emit the same events" : "Transactions emit different events"}

            {eventsComparison.tx1Only.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium">Events only in TX 1:</p>
                <ul className="list-disc list-inside text-xs">
                  {eventsComparison.tx1Only.map((event, i) => (
                    <li key={i}>{event}</li>
                  ))}
                </ul>
              </div>
            )}

            {eventsComparison.tx2Only.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium">Events only in TX 2:</p>
                <ul className="list-disc list-inside text-xs">
                  {eventsComparison.tx2Only.map((event, i) => (
                    <li key={i}>{event}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium">TX 1 Events:</p>
                <ul className="list-disc list-inside text-xs">
                  {tx1Events.length > 0 ? tx1Events.map((event, i) => <li key={i}>{event}</li>) : <li>No events</li>}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium">TX 2 Events:</p>
                <ul className="list-disc list-inside text-xs">
                  {tx2Events.length > 0 ? tx2Events.map((event, i) => <li key={i}>{event}</li>) : <li>No events</li>}
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertTitle className="flex items-center">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transaction Status
          </AlertTitle>
          <AlertDescription>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium">TX 1 Status:</p>
                <p className="text-xs">
                  {tx1Data.receipt ? (tx1Data.receipt.status === 1 ? "Success" : "Failed") : "Pending"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium">TX 2 Status:</p>
                <p className="text-xs">
                  {tx2Data.receipt ? (tx2Data.receipt.status === 1 ? "Success" : "Failed") : "Pending"}
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Transaction Comparison Tool</h1>
      <p className="text-muted-foreground mb-6">
        Compare two transactions to identify differences in function calls, parameters, and emitted events. This can
        help diagnose why similar transactions might have different outcomes.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>Enter the transaction hashes you want to compare and select the network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Network</label>
              <select
                className="w-full p-2 border rounded-md"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                disabled={loading}
              >
                <option value="pulsechain">PulseChain</option>
                <option value="ethereum">Ethereum</option>
                <option value="bsc">Binance Smart Chain</option>
                <option value="polygon">Polygon</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Transaction 1 Hash (Your Transaction)</label>
              <div className="flex space-x-2">
                <Input
                  value={tx1Hash}
                  onChange={(e) => setTx1Hash(e.target.value)}
                  placeholder="0x..."
                  disabled={loading}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => findTransactionNetwork(tx1Hash)}
                  disabled={loading || !tx1Hash}
                >
                  Find Network
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Transaction 2 Hash (Reference Transaction)</label>
              <div className="flex space-x-2">
                <Input
                  value={tx2Hash}
                  onChange={(e) => setTx2Hash(e.target.value)}
                  placeholder="0x..."
                  disabled={loading}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => findTransactionNetwork(tx2Hash)}
                  disabled={loading || !tx2Hash}
                >
                  Find Network
                </Button>
              </div>
            </div>

            <Button onClick={compareTransactions} disabled={loading || !tx1Hash || !tx2Hash} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                "Compare Transactions"
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {(tx1Data || tx2Data) && (
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="tx1">Transaction 1 Details</TabsTrigger>
            <TabsTrigger value="tx2">Transaction 2 Details</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Comparison</CardTitle>
                <CardDescription>Differences between the two transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {tx1Data && tx2Data ? (
                  renderComparison()
                ) : (
                  <p className="text-muted-foreground">Please fetch both transactions to see a comparison</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tx1" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction 1 Details</CardTitle>
                <CardDescription>Detailed information about the first transaction</CardDescription>
              </CardHeader>
              <CardContent>
                {tx1Data ? (
                  renderTransactionDetails(tx1Data)
                ) : (
                  <p className="text-muted-foreground">No data available for Transaction 1</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tx2" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction 2 Details</CardTitle>
                <CardDescription>Detailed information about the second transaction</CardDescription>
              </CardHeader>
              <CardContent>
                {tx2Data ? (
                  renderTransactionDetails(tx2Data)
                ) : (
                  <p className="text-muted-foreground">No data available for Transaction 2</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">How to Use This Tool</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Enter your transaction hash in the "Transaction 1" field</li>
          <li>Enter a reference transaction hash in the "Transaction 2" field</li>
          <li>Select the network where the transactions were executed</li>
          <li>Click "Compare Transactions" to analyze both transactions</li>
          <li>Review the comparison to identify differences</li>
        </ol>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            If you're not sure which network your transaction is on, use the "Find Network" button to automatically
            detect it.
          </p>
        </div>
      </div>
    </div>
  )
}

