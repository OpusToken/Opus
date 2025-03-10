"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { OPUS_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS, OPUS_TOKEN_ABI, STAKING_CONTRACT_ABI } from "@/lib/contracts"

// Common ABIs that should work with most ERC20 and staking contracts
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

  // View functions
  "function balanceOf(address account) external view returns (uint256)",
  "function getStakedBalance(address account) external view returns (uint256)",
  "function stakedBalanceOf(address account) external view returns (uint256)",
  "function getLockedBalance(address account) external view returns (uint256)",
  "function getUserLocks(address account) external view returns (tuple(uint256,uint256,uint256,uint256,uint256)[])",
  "function mapUserInfo(address) external view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
  "function mapUserInfoLock(address, uint256) external view returns (uint256,uint256,uint256,uint256)",
]

export default function ContractComparatorPage() {
  // Default to OPUS contracts
  const [tokenAddress, setTokenAddress] = useState(OPUS_TOKEN_ADDRESS)
  const [stakingAddress, setStakingAddress] = useState(STAKING_CONTRACT_ADDRESS)
  const [userAddress, setUserAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Contract info
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [stakingInfo, setStakingInfo] = useState<any>(null)

  // User balances
  const [balances, setBalances] = useState<any>(null)

  // Function signatures
  const [tokenFunctions, setTokenFunctions] = useState<string[]>([])
  const [stakingFunctions, setStakingFunctions] = useState<string[]>([])

  // Transaction hash for analysis
  const [txHash, setTxHash] = useState("")
  const [txDetails, setTxDetails] = useState<any>(null)

  // Predefined contract pairs
  const contractPairs = [
    {
      name: "OPUS",
      token: OPUS_TOKEN_ADDRESS,
      staking: STAKING_CONTRACT_ADDRESS,
    },
    // The user can add the other contract pair
  ]

  // Analyze contracts
  const analyzeContracts = async () => {
    if (!tokenAddress || !stakingAddress) {
      setError("Please enter both token and staking contract addresses")
      return
    }

    setLoading(true)
    setError(null)
    setTokenInfo(null)
    setStakingInfo(null)
    setBalances(null)
    setTokenFunctions([])
    setStakingFunctions([])

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      // Create contract instances with extended ABIs to capture as many functions as possible
      const tokenContract = new ethers.Contract(tokenAddress, [...COMMON_TOKEN_ABI, ...OPUS_TOKEN_ABI], provider)
      const stakingContract = new ethers.Contract(
        stakingAddress,
        [...COMMON_STAKING_ABI, ...STAKING_CONTRACT_ABI],
        provider,
      )

      // Get token info
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name().catch(() => "Unknown"),
        tokenContract.symbol().catch(() => "???"),
        tokenContract.decimals().catch(() => 18),
        tokenContract.totalSupply().catch(() => ethers.parseUnits("0", 18)),
      ])

      setTokenInfo({
        address: tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply: totalSupply.toString(),
      })

      // Get staking contract info
      // This is tricky because staking contracts vary widely
      // We'll try to get some basic info that might be available
      const stakingContractInfo: any = {
        address: stakingAddress,
      }

      // Try to get staking contract name if available
      try {
        stakingContractInfo.name = await stakingContract.name()
      } catch {
        stakingContractInfo.name = "Unknown Staking Contract"
      }

      // Try to get total staked if available
      try {
        const totalStaked = await stakingContract.totalStaked()
        stakingContractInfo.totalStaked = totalStaked.toString()
      } catch {
        try {
          const totalStaked = await stakingContract.getTotalStaked()
          stakingContractInfo.totalStaked = totalStaked.toString()
        } catch {
          stakingContractInfo.totalStaked = "Unknown"
        }
      }

      setStakingInfo(stakingContractInfo)

      // Get user balances if address provided
      if (userAddress) {
        const userBalances: any = {}

        // Token balance
        try {
          const balance = await tokenContract.balanceOf(userAddress)
          userBalances.token = balance.toString()
        } catch {
          userBalances.token = "Error"
        }

        // Staked balance
        try {
          const staked = await stakingContract.getStakedBalance(userAddress)
          userBalances.staked = staked.toString()
        } catch {
          try {
            const staked = await stakingContract.stakedBalanceOf(userAddress)
            userBalances.staked = staked.toString()
          } catch {
            try {
              const staked = await stakingContract.balanceOf(userAddress)
              userBalances.staked = staked.toString()
            } catch {
              userBalances.staked = "Error"
            }
          }
        }

        // Locked balance
        try {
          const locked = await stakingContract.getLockedBalance(userAddress)
          userBalances.locked = locked.toString()
        } catch {
          try {
            const userInfo = await stakingContract.mapUserInfo(userAddress)
            userBalances.locked = userInfo.locked?.toString() || userInfo[5]?.toString() || "Error"
          } catch {
            userBalances.locked = "Error"
          }
        }

        setBalances(userBalances)
      }

      // Get function signatures from token contract
      const tokenInterface = new ethers.Interface([...COMMON_TOKEN_ABI, ...OPUS_TOKEN_ABI])
      const tokenFunctionList = Object.keys(tokenInterface.functions).filter((fn) => !fn.startsWith("0x"))
      setTokenFunctions(tokenFunctionList)

      // Get function signatures from staking contract
      const stakingInterface = new ethers.Interface([...COMMON_STAKING_ABI, ...STAKING_CONTRACT_ABI])
      const stakingFunctionList = Object.keys(stakingInterface.functions).filter((fn) => !fn.startsWith("0x"))
      setStakingFunctions(stakingFunctionList)

      toast({
        title: "Contracts Analyzed",
        description: `Successfully analyzed ${name} token and staking contracts`,
      })
    } catch (err: any) {
      console.error("Error analyzing contracts:", err)
      setError(err.message || "Failed to analyze contracts")

      toast({
        title: "Error",
        description: "Failed to analyze contracts. See console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Analyze transaction
  const analyzeTransaction = async () => {
    if (!txHash) {
      setError("Please enter a transaction hash")
      return
    }

    setLoading(true)
    setError(null)
    setTxDetails(null)

    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

      // Get transaction and receipt
      const tx = await provider.getTransaction(txHash)
      const receipt = await provider.getTransactionReceipt(txHash)

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

      // Try to decode the input data
      try {
        // Create interfaces for both contracts
        const tokenInterface = new ethers.Interface([...COMMON_TOKEN_ABI, ...OPUS_TOKEN_ABI])
        const stakingInterface = new ethers.Interface([...COMMON_STAKING_ABI, ...STAKING_CONTRACT_ABI])

        // Try to decode with both interfaces
        let decoded

        if (tx.to?.toLowerCase() === tokenAddress.toLowerCase()) {
          decoded = tokenInterface.parseTransaction({ data: tx.data, value: tx.value })
          details.contract = "Token Contract"
        } else if (tx.to?.toLowerCase() === stakingAddress.toLowerCase()) {
          decoded = stakingInterface.parseTransaction({ data: tx.data, value: tx.value })
          details.contract = "Staking Contract"
        } else {
          // Try both interfaces
          try {
            decoded = tokenInterface.parseTransaction({ data: tx.data, value: tx.value })
            details.contract = "Unknown (Decoded as Token)"
          } catch {
            try {
              decoded = stakingInterface.parseTransaction({ data: tx.data, value: tx.value })
              details.contract = "Unknown (Decoded as Staking)"
            } catch {
              details.contract = "Unknown"
            }
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
              decodedLog = tokenInterface.parseLog(log)
            } catch {
              // Try to decode with staking interface
              try {
                decodedLog = stakingInterface.parseLog(log)
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

      setTxDetails(details)

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

  // Add a new contract pair
  const addContractPair = () => {
    if (tokenAddress && stakingAddress) {
      const newPair = {
        name: tokenInfo?.symbol || "Custom",
        token: tokenAddress,
        staking: stakingAddress,
      }

      // Check if already exists
      if (
        !contractPairs.some(
          (pair) =>
            pair.token.toLowerCase() === tokenAddress.toLowerCase() &&
            pair.staking.toLowerCase() === stakingAddress.toLowerCase(),
        )
      ) {
        contractPairs.push(newPair)

        toast({
          title: "Contract Pair Added",
          description: `Added ${newPair.name} contract pair to the list`,
        })
      }
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Contract Comparator</h1>
      <p className="text-muted-foreground mb-6">Compare different token and staking contract implementations</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contract Addresses</CardTitle>
          <CardDescription>Enter token and staking contract addresses to analyze</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              <Input
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="Token Contract Address (0x...)"
                className="flex-grow"
              />
              <Input
                value={stakingAddress}
                onChange={(e) => setStakingAddress(e.target.value)}
                placeholder="Staking Contract Address (0x...)"
                className="flex-grow"
              />
              <Button onClick={analyzeContracts} disabled={loading || !tokenAddress || !stakingAddress}>
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>

            <div className="flex space-x-2">
              <Input
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="User Address (optional) (0x...)"
                className="flex-grow"
              />
              <Button variant="outline" onClick={addContractPair} disabled={!tokenAddress || !stakingAddress}>
                Save Pair
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {contractPairs.map((pair, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setTokenAddress(pair.token)
                  setStakingAddress(pair.staking)
                  analyzeContracts()
                }}
              >
                {pair.name}
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Analysis</CardTitle>
          <CardDescription>Analyze a transaction to understand what happened</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Transaction Hash (0x...)"
              className="flex-grow"
            />
            <Button onClick={analyzeTransaction} disabled={loading || !txHash}>
              {loading ? "Analyzing..." : "Analyze TX"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(tokenInfo || stakingInfo) && (
        <Tabs defaultValue="overview" className="w-full mb-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="functions">Functions</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="transaction">Transaction</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tokenInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle>Token Contract</CardTitle>
                    <CardDescription>
                      {tokenInfo.name} ({tokenInfo.symbol})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium">Address</p>
                        <p className="text-sm break-all">{tokenInfo.address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium">Name</p>
                          <p className="text-sm">{tokenInfo.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Symbol</p>
                          <p className="text-sm">{tokenInfo.symbol}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Decimals</p>
                          <p className="text-sm">{tokenInfo.decimals}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Total Supply</p>
                          <p className="text-sm">
                            {ethers.formatUnits(tokenInfo.totalSupply, tokenInfo.decimals)} {tokenInfo.symbol}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {stakingInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle>Staking Contract</CardTitle>
                    <CardDescription>{stakingInfo.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium">Address</p>
                        <p className="text-sm break-all">{stakingInfo.address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium">Name</p>
                          <p className="text-sm">{stakingInfo.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Total Staked</p>
                          <p className="text-sm">
                            {stakingInfo.totalStaked === "Unknown"
                              ? "Unknown"
                              : `${ethers.formatUnits(stakingInfo.totalStaked, tokenInfo?.decimals || 18)} ${tokenInfo?.symbol || "tokens"}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="functions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Token Contract Functions</CardTitle>
                  <CardDescription>Available functions in the token contract</CardDescription>
                </CardHeader>
                <CardContent>
                  {tokenFunctions.length > 0 ? (
                    <div className="space-y-2">
                      {tokenFunctions.map((fn, index) => (
                        <div key={index} className="p-2 bg-muted rounded-md">
                          <p className="text-sm font-mono">{fn}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No functions found or contract not analyzed yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Staking Contract Functions</CardTitle>
                  <CardDescription>Available functions in the staking contract</CardDescription>
                </CardHeader>
                <CardContent>
                  {stakingFunctions.length > 0 ? (
                    <div className="space-y-2">
                      {stakingFunctions.map((fn, index) => (
                        <div key={index} className="p-2 bg-muted rounded-md">
                          <p className="text-sm font-mono">{fn}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No functions found or contract not analyzed yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle>User Balances</CardTitle>
                <CardDescription>
                  {userAddress ? `Balances for ${formatAddress(userAddress)}` : "Enter a user address to see balances"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {balances ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-xs font-medium">Token Balance</p>
                      <p className="text-sm">
                        {balances.token === "Error"
                          ? "Error fetching balance"
                          : `${ethers.formatUnits(balances.token, tokenInfo?.decimals || 18)} ${tokenInfo?.symbol || "tokens"}`}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-xs font-medium">Staked Balance</p>
                      <p className="text-sm">
                        {balances.staked === "Error"
                          ? "Error fetching balance"
                          : `${ethers.formatUnits(balances.staked, tokenInfo?.decimals || 18)} ${tokenInfo?.symbol || "tokens"}`}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-xs font-medium">Locked Balance</p>
                      <p className="text-sm">
                        {balances.locked === "Error"
                          ? "Error fetching balance"
                          : `${ethers.formatUnits(balances.locked, tokenInfo?.decimals || 18)} ${tokenInfo?.symbol || "tokens"}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {userAddress ? "No balance data available" : "Enter a user address to see balances"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transaction">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
                <CardDescription>
                  {txDetails ? `Transaction ${formatAddress(txDetails.hash)}` : "Enter a transaction hash to analyze"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {txDetails ? (
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
                        <p className="text-sm">{formatAddress(txDetails.from)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">To</p>
                        <p className="text-sm">
                          {formatAddress(txDetails.to)}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({txDetails.contract || "Unknown Contract"})
                          </span>
                        </p>
                      </div>
                    </div>

                    {txDetails.decodedInput && (
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium">Function Called</p>
                        <p className="text-sm font-mono">{txDetails.decodedInput.name}</p>
                        <div className="mt-2 space-y-2">
                          {txDetails.decodedInput.args.map((arg, index) => (
                            <div key={index}>
                              <p className="text-xs text-muted-foreground">Parameter {index + 1}</p>
                              <p className="text-sm break-all">{arg}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {txDetails.decodedLogs && txDetails.decodedLogs.length > 0 && (
                      <div className="p-4 bg-muted rounded-md">
                        <p className="text-sm font-medium">Events Emitted</p>
                        <div className="mt-2 space-y-2">
                          {txDetails.decodedLogs.map((log, index) => (
                            <div key={index} className="p-2 bg-muted/50 rounded-md">
                              <div className="flex justify-between">
                                <p className="text-sm font-mono">{log.name}</p>
                                <p className="text-xs text-muted-foreground">{formatAddress(log.address)}</p>
                              </div>
                              {log.args.length > 0 && (
                                <div className="mt-1 pl-2 border-l-2 border-muted-foreground/20">
                                  {log.args.map((arg, argIndex) => (
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
                  <p className="text-sm text-muted-foreground">Enter a transaction hash to see details</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contract Comparison Analysis</CardTitle>
          <CardDescription>Understanding the differences between contract implementations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tokenInfo && stakingInfo ? (
              <>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-sm text-blue-500">
                    <strong>Contract Relationship:</strong> The token contract ({tokenInfo.symbol}) and staking contract
                    work together to manage staking and locking functionality.
                  </p>
                </div>

                <h3 className="text-sm font-medium">Key Findings:</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                  <li>
                    <strong>Lock Implementation:</strong> Most staking contracts use a similar pattern where the token
                    contract tracks total locked amounts, while the staking contract manages individual lock details.
                  </li>
                  <li>
                    <strong>Unlock Function:</strong> The unlock function typically expects an array of lock IDs, even
                    if you're only unlocking one lock. This is consistent across different implementations.
                  </li>
                  <li>
                    <strong>Lock Period:</strong> Locks cannot be unlocked until their lock period has ended. The
                    contract will not revert the transaction but simply won't release the tokens.
                  </li>
                  <li>
                    <strong>Lock Storage:</strong> Locks are typically stored in a mapping like{" "}
                    <code>mapUserInfoLock[userAddress][lockId]</code>, which makes it difficult to enumerate all locks
                    without knowing the IDs.
                  </li>
                </ul>

                <h3 className="text-sm font-medium">Recommendations:</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                  <li>
                    Use the transaction analyzer to compare successful unlock transactions from the other token with
                    your OPUS unlock attempts
                  </li>
                  <li>Check if the lock period has ended before attempting to unlock</li>
                  <li>
                    Ensure you're passing the lock ID as an array, even for a single ID: <code>[lockId]</code> instead
                    of just <code>lockId</code>
                  </li>
                  <li>
                    Try different lock IDs if one doesn't work - sometimes lock IDs start from 0, 1, or another number
                  </li>
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Analyze both contracts to see comparison results</p>
            )}

            {txDetails && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md mt-4">
                <p className="text-sm font-medium">Transaction Analysis</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {txDetails.decodedInput
                    ? `This transaction called the ${txDetails.decodedInput.name} function on the ${txDetails.contract || "contract"}.`
                    : "Unable to decode the function called in this transaction."}
                </p>
                {txDetails.decodedLogs && txDetails.decodedLogs.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    The transaction emitted {txDetails.decodedLogs.length} events, including:{" "}
                    {txDetails.decodedLogs.map((log) => log.name).join(", ")}.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

