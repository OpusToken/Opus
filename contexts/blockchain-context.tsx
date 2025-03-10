"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import { ethers } from "ethers"
import { OPUS_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS, OPUS_TOKEN_ABI, STAKING_CONTRACT_ABI } from "@/lib/contracts"
import { useToast } from "@/components/ui/use-toast"

// Fallback RPC URLs for PulseChain
const RPC_URLS = [
  "https://rpc.pulsechain.com",
  "https://pulsechain.publicnode.com",
  "https://rpc-pulsechain.g4mm4.io",
  "https://pulsechain-rpc.publicnode.com",
]

// Function to get a working provider
const getWorkingProvider = async () => {
  // Try each RPC URL until one works
  for (const rpcUrl of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      // Test the provider with a simple call
      await provider.getBlockNumber()
      console.log(`Using RPC: ${rpcUrl}`)
      return provider
    } catch (error) {
      console.warn(`RPC ${rpcUrl} failed, trying next...`)
    }
  }

  // If all fail, throw an error
  throw new Error("All RPC endpoints failed. Please try again later.")
}

declare global {
  interface Window {
    userLocks?: any[]
    fetchBalances?: any
    fetchBalancesPatch?: any
    setUserLocks?: any
    unlockPatch?: any
  }
}

interface BlockchainContextType {
  account: string | null
  isConnected: boolean
  isCorrectNetwork: boolean
  connect: (provider: any) => Promise<void>
  disconnect: () => void
  refreshBalances: () => Promise<void>
  balances: {
    wallet: string
    staked: string
    locked: string
    rewards: string
    holdingRewards: string
    stakingRewards: string
    lockingRewards: string
  }
  isLoading: boolean
  contracts: {
    opusToken: any
    stakingContract: any
  }
  walletType: string | null
  provider: ethers.BrowserProvider | null
  userLocks: any[]
  stake: (amount: string) => Promise<boolean>
  unstake: (amount: string) => Promise<boolean>
  lock: (amount: string, days: number) => Promise<boolean>
  unlock: (lockId: string) => Promise<boolean>
  claimRewards: () => Promise<boolean>
}

// Initial balances state
const initialBalances = {
  wallet: "0",
  staked: "0",
  locked: "0",
  rewards: "0",
  holdingRewards: "0",
  stakingRewards: "0",
  lockingRewards: "0",
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined)

// PulseChain mainnet ID
const PULSECHAIN_ID = 369

export function BlockchainProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [walletType, setWalletType] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [contracts, setContracts] = useState<{ opusToken: any; stakingContract: any }>({
    opusToken: null,
    stakingContract: null,
  })
  const [balances, setBalances] = useState(initialBalances)
  const [userLocks, setUserLocks] = useState<any[]>([])
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Modify the checkConnection function to prevent multiple simultaneous requests
  const checkConnection = async () => {
    // Check if user manually disconnected previously
    const wasDisconnected = localStorage.getItem("walletDisconnected") === "true"

    if (wasDisconnected) {
      // Don't auto-connect if user previously disconnected
      console.log("User previously disconnected, not auto-connecting")
      return
    }

    // Add a check for pending requests
    if (window.ethereum) {
      try {
        // Check if there's a pending request by trying a non-invasive method first
        const chainId = await window.ethereum.request({ method: "eth_chainId" })
        console.log("Current chain ID:", chainId)
      } catch (error: any) {
        // If we get a "Request already pending" error, log it and return
        if (error.message && error.message.includes("already pending")) {
          console.log("Wallet connection already pending, skipping duplicate request")
          return
        }
      }
    }

    // Rest of the existing function...
    const ethereum = window.ethereum || window.rabby || window.trustwallet || window.internetmoney

    if (ethereum) {
      try {
        // Create ethers provider - use BrowserProvider for wallet connections
        const ethersProvider = new ethers.BrowserProvider(ethereum)
        setProvider(ethersProvider)

        // Get accounts - use eth_accounts instead of eth_requestAccounts to avoid prompting
        // if the wallet is already connected
        const accounts = await ethereum.request({ method: "eth_accounts" })

        if (accounts.length > 0) {
          setAccount(accounts[0])

          // Get chain ID
          const chainIdHex = await ethereum.request({ method: "eth_chainId" })
          const parsedChainId = Number.parseInt(chainIdHex, 16)
          setChainId(parsedChainId)

          // Determine wallet type
          if (ethereum === window.rabby) {
            setWalletType("Rabby")
          } else if (ethereum === window.trustwallet) {
            setWalletType("Trust Wallet")
          } else if (ethereum === window.internetmoney) {
            setWalletType("Internet Money")
          } else if (ethereum?.isMetaMask) {
            setWalletType("MetaMask")
          } else {
            setWalletType("Unknown Wallet")
          }

          // Initialize contracts
          await initializeContracts(ethersProvider)
        }
      } catch (err) {
        console.error("Failed to check wallet connection:", err)
      }
    }
  }

  useEffect(() => {
    // Check if user manually disconnected previously
    const wasDisconnected = localStorage.getItem("walletDisconnected") === "true"

    if (wasDisconnected) {
      // Don't auto-connect if user previously disconnected
      console.log("User previously disconnected, not auto-connecting")
      return
    }

    checkConnection()

    // Rest of the connection logic will proceed normally if not disconnected
  }, [])

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection()
  }, [])

  // Initialize contracts
  const initializeContracts = async (provider: ethers.BrowserProvider | ethers.JsonRpcProvider) => {
    try {
      let signer

      // Check if the provider is a BrowserProvider (has getSigner method)
      if ("getSigner" in provider) {
        signer = await (provider as ethers.BrowserProvider).getSigner()
      } else {
        // For JsonRpcProvider, we don't have a signer, so we'll use the provider directly
        signer = provider
        console.log("Using provider directly as no signer is available")
      }

      const opusToken = new ethers.Contract(OPUS_TOKEN_ADDRESS, OPUS_TOKEN_ABI, signer)
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

      setContracts({ opusToken, stakingContract })

      // Fetch balances after initializing contracts
      if (account) {
        await fetchBalances(opusToken, stakingContract, account)
      }
    } catch (error) {
      console.error("Error initializing contracts:", error)
    }
  }

  // Fetch balances from blockchain
  const fetchBalances = async (opusToken: any, stakingContract: any, userAddress: string) => {
    // Store the original function for patching
    window.fetchBalances = fetchBalances
    window.setUserLocks = setUserLocks

    // Check if we have a patched version
    if (window.fetchBalancesPatch) {
      console.log("Using patched fetchBalances")
      return window.fetchBalancesPatch(opusToken, stakingContract, userAddress)
    }

    setIsLoading(true)
    console.log("Fetching balances for address:", userAddress)

    try {
      if (!userAddress) {
        console.error("No user address provided for fetching balances")
        setIsLoading(false)
        return
      }

      // Try multiple methods to get staked balance with fallbacks
      const getUserInfo = async () => {
        try {
          console.log("Calling mapUserInfo for address:", userAddress)
          const userInfo = await stakingContract.mapUserInfo(userAddress)
          console.log("mapUserInfo result:", userInfo)

          // Calculate staked balance (should not subtract locked amount)
          const totalAmount = userInfo.amount
          const lockedAmount = userInfo.locked
          // Don't subtract locked amount from total staked
          const stakedBalance = totalAmount // Previously was: totalAmount - lockedAmount

          console.log("Total amount:", ethers.formatUnits(totalAmount, 18))
          console.log("Locked amount:", ethers.formatUnits(lockedAmount, 18))
          console.log("Staked balance:", ethers.formatUnits(stakedBalance, 18))

          return {
            stakedBalance,
            lockedBalance: lockedAmount,
            claimed: userInfo.claimed,
            lockClaimed: userInfo.lockClaimed,
          }
        } catch (e) {
          console.warn("mapUserInfo failed, falling back to other methods...")
          return null
        }
      }

      const getStakedBalance = async () => {
        try {
          console.log("Trying getStakedBalance method...")
          return await stakingContract.getStakedBalance(userAddress)
        } catch (e) {
          console.warn("getStakedBalance failed, trying stakedBalanceOf...")
          try {
            return await stakingContract.stakedBalanceOf(userAddress)
          } catch (e2) {
            console.warn("stakedBalanceOf failed, trying balanceOf...")
            try {
              return await stakingContract.balanceOf(userAddress)
            } catch (e3) {
              console.warn("All standard methods failed, trying getUserInfo...")
              try {
                // Some staking contracts store user data in a struct
                const userInfo = await stakingContract.getUserInfo(userAddress)
                console.log("getUserInfo result:", userInfo)
                // The staked amount might be in the first field of the struct
                return userInfo[0] || ethers.parseUnits("0", 18)
              } catch (e4) {
                console.warn("getUserInfo failed, trying userInfo mapping...")
                try {
                  // Some contracts use a mapping called userInfo
                  const userInfo = await stakingContract.userInfo(userAddress)
                  console.log("userInfo mapping result:", userInfo)
                  return userInfo.amount || userInfo[0] || ethers.parseUnits("0", 18)
                } catch (e5) {
                  console.warn("All staked balance methods failed, using 0")
                  return ethers.parseUnits("0", 18)
                }
              }
            }
          }
        }
      }

      // Create an array of promises for all the data we need to fetch
      const promises = [
        // Wallet balance
        opusToken
          .balanceOf(userAddress)
          .then((balance) => {
            console.log("Wallet balance:", ethers.formatUnits(balance, 18))
            return balance
          })
          .catch(() => {
            console.warn("Failed to get wallet balance, using 0")
            return ethers.parseUnits("0", 18)
          }),

        // Staked balance with multiple fallbacks
        (async () => {
          const userInfo = await getUserInfo()
          if (userInfo) {
            return {
              stakedBalance: userInfo.stakedBalance,
              lockedBalance: userInfo.lockedBalance,
            }
          } else {
            // Fall back to previous methods if mapUserInfo fails
            return {
              stakedBalance: await getStakedBalance(),
              lockedBalance: await (async () => {
                try {
                  return await stakingContract.getLockedBalance(userAddress)
                } catch (e) {
                  console.warn("getLockedBalance failed, trying alternative method")
                  try {
                    return await stakingContract.getUserLockedAmount(userAddress)
                  } catch (e2) {
                    console.warn("Alternative method failed too, using 0")
                    return ethers.parseUnits("0", 18)
                  }
                }
              })(),
            }
          }
        })(),

        // Available rewards - with fallback
        (async () => {
          try {
            return await stakingContract.getAvailableRewards(userAddress)
          } catch (e) {
            console.warn("getAvailableRewards failed, trying alternative method")
            try {
              // Try alternative method if available
              return await stakingContract.getPendingRewards(userAddress)
            } catch (e2) {
              console.warn("Alternative method failed too, using 0")
              return ethers.parseUnits("0", 18)
            }
          }
        })(),
      ]

      // Wait for all promises to resolve
      const [walletBalance, { stakedBalance, lockedBalance }, rewards] = await Promise.all(promises)

      console.log("Raw staked balance:", stakedBalance.toString())
      console.log("Raw locked balance:", lockedBalance.toString())

      // For demonstration, we'll split rewards evenly between sources
      // In a real implementation, you'd get these from specific contract methods
      const rewardsValue = ethers.formatUnits(rewards, 18)
      const thirdOfRewards = (Number(rewardsValue) / 3).toString()

      // Set the total staked to 5,000,000 for testing as requested
      const totalStaked = "5000000"

      setBalances({
        wallet: ethers.formatUnits(walletBalance, 18),
        staked: totalStaked, // Use the fixed value
        locked: ethers.formatUnits(lockedBalance, 18),
        rewards: rewardsValue,
        holdingRewards: thirdOfRewards,
        stakingRewards: thirdOfRewards,
        lockingRewards: thirdOfRewards,
      })

      console.log("Balances fetched successfully:", {
        wallet: ethers.formatUnits(walletBalance, 18),
        staked: ethers.formatUnits(stakedBalance, 18),
        locked: ethers.formatUnits(lockedBalance, 18),
        rewards: rewardsValue,
      })

      // Fetch user locks with fallback - improved for real blockchain locks
      try {
        console.log("Attempting to fetch user locks for address:", userAddress)
        let locks = []
        let fetchSuccess = false

        // Try multiple methods to get user locks with better error handling
        const lockFetchMethods = [
          {
            name: "getUserLocks",
            fn: async () => await stakingContract.getUserLocks(userAddress),
          },
          {
            name: "getLockPositions",
            fn: async () => await stakingContract.getLockPositions(userAddress),
          },
          {
            name: "getLocks",
            fn: async () => await stakingContract.getLocks(userAddress),
          },
          {
            name: "getUserLockInfo",
            fn: async () => await stakingContract.getUserLockInfo(userAddress),
          },
          {
            name: "mapUserLocks",
            fn: async () => await stakingContract.mapUserLocks(userAddress),
          },
        ]

        // Try each method until one works
        for (const method of lockFetchMethods) {
          try {
            console.log(`Trying ${method.name} method...`)
            const result = await method.fn()
            console.log(`${method.name} result:`, result)

            if (result && (Array.isArray(result) || typeof result === "object")) {
              locks = result
              fetchSuccess = true
              console.log(`Successfully fetched locks using ${method.name}`)
              break
            }
          } catch (e) {
            console.warn(`${method.name} failed:`, e)
          }
        }

        // If all direct methods fail, try getting lock IDs first
        if (!fetchSuccess) {
          try {
            console.log("Trying to get lock IDs first...")
            const lockIds = await stakingContract.getUserLockIds(userAddress)
            console.log("Lock IDs:", lockIds)

            if (lockIds && lockIds.length > 0) {
              const lockPromises = lockIds.map((id) =>
                stakingContract.getLockInfo(id).catch((err) => {
                  console.warn(`Failed to get info for lock ID ${id}:`, err)
                  return null
                }),
              )

              const lockDetails = await Promise.all(lockPromises)
              locks = lockDetails.filter((lock) => lock !== null)
              console.log("Fetched lock details from IDs:", locks)
              fetchSuccess = true
            }
          } catch (e) {
            console.warn("Failed to get lock IDs:", e)
          }
        }

        // Process locks data to ensure it's in the expected format
        if (locks && (Array.isArray(locks) || typeof locks === "object")) {
          console.log("Raw locks data:", locks)
          console.log("Lock data type:", typeof locks)
          if (Array.isArray(locks)) {
            console.log("Locks is an array with length:", locks.length)
          } else if (typeof locks === "object") {
            console.log("Locks is an object with keys:", Object.keys(locks))
          }

          // Convert locks to array if it's not already
          const locksArray = Array.isArray(locks) ? locks : Object.values(locks)
          console.log("Converted to array:", locksArray)
          console.log("Lock array item sample:", locksArray.length > 0 ? locksArray[0] : "No locks")

          // Filter out any invalid locks (e.g., with zero amount)
          const validLocks = locksArray
            .filter((lock) => {
              if (!lock) return false

              // Extract amount from various possible formats
              const amount = lock.amount || lock[1] || 0
              console.log("Lock amount:", amount.toString())

              // Check if amount is greater than 0
              try {
                return !ethers.getBigInt(amount).isZero()
              } catch (e) {
                console.warn("Error checking lock amount:", e)
                return false
              }
            })
            .map((lock) => {
              // Normalize lock data structure
              const id = lock.id || lock[0] || 0
              const amount = lock.amount || lock[1] || 0

              // Handle different timestamp formats
              let startTime, endTime, lockPeriod

              if (lock.startTime) {
                startTime = Number(lock.startTime)
              } else if (lock.start) {
                startTime = Number(lock.start)
              } else if (lock[2]) {
                startTime = Number(lock[2])
              } else {
                startTime = Math.floor(Date.now() / 1000 - 86400) // Default to 1 day ago
              }

              if (lock.endTime) {
                endTime = Number(lock.endTime)
              } else if (lock.end) {
                endTime = Number(lock.end)
              } else if (lock[3]) {
                endTime = Number(lock[3])
              } else {
                endTime = Math.floor(Date.now() / 1000 + 86400 * 90) // Default to 90 days from now
              }

              // Calculate lock period in days if not directly available
              if (lock.lockPeriod) {
                lockPeriod = Number(lock.lockPeriod)
              } else if (lock.period) {
                lockPeriod = Number(lock.period)
              } else if (lock[4]) {
                lockPeriod = Number(lock[4])
              } else {
                // Calculate period from start and end time
                lockPeriod = Math.floor((endTime - startTime) / (24 * 60 * 60))
                console.log(`Calculated lock period: ${lockPeriod} days from timestamps`)
              }

              // Ensure lock period is at least 1 day
              if (lockPeriod < 1) {
                lockPeriod = 90 // Default to 90 days if calculation fails
                console.log("Lock period too small, defaulting to 90 days")
              }

              console.log("Normalized lock:", {
                id: id.toString(),
                amount: amount.toString(),
                startTime,
                endTime,
                lockPeriod,
              })

              return {
                id: id.toString(), // Ensure ID is a string
                amount,
                startTime,
                endTime,
                lockPeriod,
              }
            })

          console.log("Processed locks data:", validLocks)
          if (validLocks.length === 0) {
            console.warn(
              "No valid locks found after processing. Check if lock amounts are non-zero and data structure is correct.",
            )
          }
          setUserLocks(validLocks)
        } else {
          console.log("No locks found or empty locks array returned")
          setUserLocks([])
        }
      } catch (error) {
        console.error("Error fetching user locks:", error)
        setUserLocks([])
      }
    } catch (error) {
      console.error("Error fetching balances:", error)
      toast({
        title: "Error",
        description: "Failed to fetch your balances. Please try again.",
        variant: "destructive",
      })
      // Set default values on error
      setBalances(initialBalances)
      setUserLocks([])
    } finally {
      setIsLoading(false)
    }
  }

  // Direct method to fetch user locks with improved error handling
  const fetchUserLocks = async (userAddress: string) => {
    if (!userAddress) {
      console.error("No user address provided for fetching locks")
      return []
    }

    console.log("Attempting to fetch real user locks for:", userAddress)

    try {
      // Get a provider directly to ensure we have a fresh connection
      const provider = await getWorkingProvider()
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // Try direct RPC calls first - this might be more reliable for nonce-based systems
      try {
        console.log("Trying direct RPC call to get locks...")
        // This is a more direct approach using low-level RPC calls
        const functionSignature = ethers.id("getUserLocks(address)").slice(0, 10)
        console.log("Function signature:", functionSignature)

        const encodedAddress = ethers.zeroPadValue(userAddress, 32)
        console.log("Encoded address:", encodedAddress)

        const callData = ethers.concat([functionSignature, encodedAddress])
        console.log("Call data:", callData)

        const result = await provider.call({
          to: STAKING_CONTRACT_ADDRESS,
          data: callData,
        })

        console.log("Direct RPC call result:", result)

        if (result && result !== "0x") {
          try {
            // Try to decode the result - we'll try multiple formats
            console.log("Attempting to decode RPC result...")

            // Try different ABI formats for decoding
            const decodingFormats = [
              ["tuple(uint256,uint256,uint256,uint256,uint256)[]"],
              ["tuple(uint256,uint256,uint256,uint256,uint256,uint256)[]"], // With nonce
              ["tuple(uint256 id,uint256 amount,uint256 startTime,uint256 endTime,uint256 rewardRate)[]"],
              ["tuple(uint256 nonce,uint256 amount,uint256 startTime,uint256 endTime,uint256 rewardRate)[]"],
            ]

            for (const format of decodingFormats) {
              try {
                console.log(`Trying to decode with format: ${format}`)
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(format, result)[0]
                console.log("Successfully decoded:", decoded)

                if (decoded && decoded.length > 0) {
                  // Transform to our expected format
                  return decoded.map((item, index) => {
                    // Check if the item has named properties
                    if (item.nonce !== undefined) {
                      return {
                        id: item.nonce.toString(),
                        amount: item.amount,
                        startTime: Number(item.startTime),
                        endTime: Number(item.endTime),
                        lockPeriod: Math.floor((Number(item.endTime) - Number(item.startTime)) / (24 * 60 * 60)),
                      }
                    } else if (item.id !== undefined) {
                      return {
                        id: item.id.toString(),
                        amount: item.amount,
                        startTime: Number(item.startTime),
                        endTime: Number(item.endTime),
                        lockPeriod: Math.floor((Number(item.endTime) - Number(item.startTime)) / (24 * 60 * 60)),
                      }
                    } else {
                      // Assume array format
                      return {
                        id: item[0].toString(), // This could be nonce or id
                        amount: item[1],
                        startTime: Number(item[2]),
                        endTime: Number(item[3]),
                        lockPeriod: Math.floor((Number(item[3]) - Number(item[2])) / (24 * 60 * 60)),
                      }
                    }
                  })
                }
              } catch (decodeError) {
                console.warn(`Failed to decode with format ${format}:`, decodeError)
              }
            }
          } catch (decodeError) {
            console.warn("Failed to decode RPC result:", decodeError)
          }
        }
      } catch (rpcError) {
        console.warn("Direct RPC call failed:", rpcError)
      }

      // Try the most common method first with detailed logging
      try {
        console.log("Trying getUserLocks method...")
        const result = await stakingContract.getUserLocks(userAddress)
        console.log("getUserLocks raw result:", result)

        if (result && Array.isArray(result) && result.length > 0) {
          console.log("Successfully fetched locks using getUserLocks")
          return result
        }
      } catch (e) {
        console.warn("getUserLocks failed:", e)
      }

      // Try alternative methods with more detailed error handling
      const methods = [
        { name: "getLockPositions", args: [userAddress] },
        { name: "getLocks", args: [userAddress] },
        { name: "getUserLockInfo", args: [userAddress] },
        { name: "mapUserLocks", args: [userAddress] },
        // Try with different argument formats
        { name: "getUserLocks", args: [userAddress, true] },
        { name: "getUserLocks", args: [userAddress, false] },
      ]

      for (const method of methods) {
        try {
          console.log(`Trying ${method.name} with args:`, method.args)
          // Add timeout to prevent hanging
          const result = await Promise.race([
            stakingContract[method.name](...method.args),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`${method.name} timed out`)), 10000)),
          ])

          console.log(`${method.name} result:`, result)

          if (result && (Array.isArray(result) || typeof result === "object")) {
            // Process the result to normalize it
            const processedLocks = Array.isArray(result) ? result : Object.values(result)

            console.log(`Processed ${method.name} result:`, processedLocks)

            // If we got a valid result, return it
            if (processedLocks.length > 0) {
              return processedLocks
            }
          }
        } catch (error) {
          console.warn(`${method.name} failed:`, error)
        }
      }

      // If direct methods fail, try getting lock IDs first
      try {
        console.log("Trying to get lock IDs first...")
        const lockIds = await stakingContract.getUserLockIds(userAddress)
        console.log("Lock IDs:", lockIds)

        if (lockIds && lockIds.length > 0) {
          const lockPromises = lockIds.map((id) =>
            stakingContract.getLockInfo(id).catch((err) => {
              console.warn(`Failed to get info for lock ID ${id}:`, err)
              return null
            }),
          )

          const lockDetails = await Promise.all(lockPromises)
          const validLocks = lockDetails.filter((lock) => lock !== null)
          console.log("Fetched lock details from IDs:", validLocks)

          if (validLocks.length > 0) {
            return validLocks
          }
        }
      } catch (error) {
        console.warn("Failed to get lock IDs:", error)
      }

      console.log("All methods failed to fetch locks, returning empty array")
      return []
    } catch (error) {
      console.error("Error in fetchUserLocks:", error)
      return []
    }
  }

  // Stake tokens
  const stake = async (amount: string) => {
    if (!account || !contracts.opusToken || !contracts.stakingContract || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to stake tokens.",
        variant: "destructive",
      })
      return false
    }

    setIsLoading(true)

    try {
      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount, 18)
      console.log(`Attempting to stake ${amount} OPUS (${amountWei.toString()} wei)`)

      // Check allowance
      const allowance = await contracts.opusToken.allowance(account, STAKING_CONTRACT_ADDRESS)
      console.log(`Current allowance: ${ethers.formatUnits(allowance, 18)} OPUS`)

      // If allowance is less than amount, approve first
      if (allowance < amountWei) {
        console.log("Insufficient allowance, requesting approval...")
        const approveTx = await contracts.opusToken.approve(STAKING_CONTRACT_ADDRESS, amountWei)
        console.log("Approval transaction sent:", approveTx.hash)
        const approveReceipt = await approveTx.wait()
        console.log("Approval confirmed in block:", approveReceipt.blockNumber)

        toast({
          title: "Approval successful",
          description: "Your tokens have been approved for staking.",
        })
      }

      // Stake tokens (using deposit function)
      console.log("Sending stake transaction...")
      const stakeTx = await contracts.stakingContract.deposit(amountWei)
      console.log("Stake transaction sent:", stakeTx.hash)
      const stakeReceipt = await stakeTx.wait()
      console.log("Stake confirmed in block:", stakeReceipt.blockNumber)

      // Refresh balances immediately after confirmation
      console.log("Transaction confirmed, refreshing balances...")
      await refreshBalances()

      toast({
        title: "Staking successful",
        description: `You have successfully staked ${amount} OPUS tokens.`,
      })

      return true
    } catch (error: any) {
      console.error("Error staking tokens:", error)

      if (error.code === 4001) {
        toast({
          title: "Transaction rejected",
          description: "You rejected the transaction.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Staking failed",
          description: "There was an error staking your tokens. Please try again.",
          variant: "destructive",
        })
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Unstake tokens
  const unstake = async (amount: string) => {
    if (!account || !contracts.stakingContract || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to unstake tokens.",
        variant: "destructive",
      })
      return false
    }

    setIsLoading(true)

    try {
      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount, 18)

      // Unstake tokens (using withdraw function)
      const unstakeTx = await contracts.stakingContract.withdraw(amountWei)
      await unstakeTx.wait()

      // Implement multiple refresh attempts with increasing delays
      const refreshWithRetries = async (attempts = 3, initialDelay = 2000) => {
        let currentDelay = initialDelay

        for (let i = 0; i < attempts; i++) {
          // Wait for the blockchain state to update
          await new Promise((resolve) => setTimeout(resolve, currentDelay))

          console.log(`Refresh attempt ${i + 1} after ${currentDelay}ms delay`)
          await refreshBalances()

          // Increase delay for next attempt
          currentDelay *= 1.5
        }
      }

      // Start the refresh process
      refreshWithRetries()

      toast({
        title: "Unstaking successful",
        description: `You have successfully unstaked ${amount} OPUS tokens.`,
      })

      return true
    } catch (error: any) {
      console.error("Error unstaking tokens:", error)

      if (error.code === 4001) {
        toast({
          title: "Transaction rejected",
          description: "You rejected the transaction.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Unstaking failed",
          description: "There was an error unstaking your tokens. Please try again.",
          variant: "destructive",
        })
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Find the lock function and update it to ensure the days parameter is properly handled

  // Lock tokens
  const lock = async (amount: string, days: number) => {
    if (!account || !contracts.opusToken || !contracts.stakingContract || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to lock tokens.",
        variant: "destructive",
      })
      return false
    }

    setIsLoading(true)

    try {
      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount, 18)

      // Ensure days is at least 90
      if (days < 90) {
        throw new Error("Minimum lock period is 90 days")
      }

      // Convert days to seconds for the contract (if the contract expects seconds)
      const lockPeriodInSeconds = days * 24 * 60 * 60

      // Check allowance
      const allowance = await contracts.opusToken.allowance(account, STAKING_CONTRACT_ADDRESS)

      // If allowance is less than amount, approve first
      if (allowance < amountWei) {
        const approveTx = await contracts.opusToken.approve(STAKING_CONTRACT_ADDRESS, amountWei)
        await approveTx.wait()

        toast({
          title: "Approval successful",
          description: "Your tokens have been approved for locking.",
        })
      }

      console.log(`Locking ${amount} OPUS for ${days} days (${lockPeriodInSeconds} seconds)`)

      // Try both ways of calling the lock function
      let lockTx
      try {
        // First try with days directly
        lockTx = await contracts.stakingContract.lock(amountWei, days)
      } catch (error) {
        console.log("First lock attempt failed, trying with seconds:", error)
        // If that fails, try with seconds
        lockTx = await contracts.stakingContract.lock(amountWei, lockPeriodInSeconds)
      }

      await lockTx.wait()

      // Implement multiple refresh attempts with increasing delays
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

      // Start the refresh process
      refreshWithRetries()

      toast({
        title: "Locking successful",
        description: `You have successfully locked ${amount} OPUS tokens for ${days} days.`,
      })

      return true
    } catch (error: any) {
      console.error("Error locking tokens:", error)

      if (error.code === 4001) {
        toast({
          title: "Transaction rejected",
          description: "You rejected the transaction.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Locking failed",
          description: error.reason || error.message || "There was an error locking your tokens. Please try again.",
          variant: "destructive",
        })
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Unlock tokens
  const unlock = async (lockId: string) => {
    if (!account || !contracts.stakingContract || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to unlock tokens.",
        variant: "destructive",
      })
      return false
    }

    setIsLoading(true)

    try {
      // Check if we have a mock unlock function
      if (window.unlockPatch) {
        console.log("Using mock unlock function for lock ID:", lockId)
        const success = await window.unlockPatch(lockId)

        if (success) {
          // Refresh balances
          await refreshBalances()

          toast({
            title: "Unlocking successful",
            description: "You have successfully unlocked your tokens using mock data.",
          })

          return true
        } else {
          throw new Error("Mock unlock failed")
        }
      } else {
        // Use the real contract function
        const unlockTx = await contracts.stakingContract.unlock(lockId)
        await unlockTx.wait()

        // Refresh balances
        await refreshBalances()

        toast({
          title: "Unlocking successful",
          description: "You have successfully unlocked your tokens.",
        })

        return true
      }
    } catch (error: any) {
      console.error("Error unlocking tokens:", error)

      if (error.code === 4001) {
        toast({
          title: "Transaction rejected",
          description: "You rejected the transaction.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Unlocking failed",
          description: error.message || "There was an error unlocking your tokens. Please try again.",
        })
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Claim rewards
  const claimRewards = async () => {
    if (!account || !contracts.stakingContract || !provider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim rewards.",
        variant: "destructive",
      })
      return false
    }

    setIsLoading(true)

    try {
      // Claim rewards
      const claimTx = await contracts.stakingContract.claimRewards()
      await claimTx.wait()

      // Refresh balances
      await refreshBalances()

      toast({
        title: "Claim successful",
        description: "You have successfully claimed your rewards.",
      })

      return true
    } catch (error: any) {
      console.error("Error claiming rewards:", error)

      if (error.code === 4001) {
        toast({
          title: "Transaction rejected",
          description: "You rejected the transaction.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Claim failed",
          description: "There was an error claiming your rewards. Please try again.",
        })
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }

  const isCorrectNetwork = chainId === PULSECHAIN_ID

  const connect = useCallback(async (provider: any) => {
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" })
      if (accounts.length > 0) {
        setAccount(accounts[0])
        localStorage.setItem("walletDisconnected", "false") // Clear disconnect flag
      }

      const chainIdHex = await provider.request({ method: "eth_chainId" })
      const parsedChainId = Number.parseInt(chainIdHex, 16)
      setChainId(parsedChainId)

      // Determine wallet type
      if (provider === window.rabby) {
        setWalletType("Rabby")
      } else if (provider === window.trustwallet) {
        setWalletType("Trust Wallet")
      } else if (provider === window.internetmoney) {
        setWalletType("Internet Money")
      } else if (provider?.isMetaMask) {
        setWalletType("MetaMask")
      } else {
        setWalletType("Unknown Wallet")
      }

      // Create a proper BrowserProvider
      const ethersProvider = new ethers.BrowserProvider(provider)
      setProvider(ethersProvider)

      // Initialize contracts
      await initializeContracts(ethersProvider)
    } catch (error) {
      console.error("Error connecting wallet:", error)
    }
  }, [])

  const disconnect = () => {
    setAccount(null)
    setWalletType(null)
    setBalances(initialBalances)
    setUserLocks([])
    setContracts({ opusToken: null, stakingContract: null })
    localStorage.setItem("walletDisconnected", "true") // Remember disconnect
  }

  // Add this function to the BlockchainContext provider
  // This should be placed inside the BlockchainProvider component

  // Improved function to fetch user locks based on transaction analysis
  const fetchUserLocksImproved = async (userAddress: string) => {
    if (!userAddress) {
      console.error("No user address provided for fetching locks")
      return []
    }

    console.log("Attempting to fetch user locks with improved method for:", userAddress)

    try {
      // Get a provider directly to ensure we have a fresh connection
      const provider = await getWorkingProvider()
      const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

      // First try to get lock IDs - this seems to be the most reliable method
      try {
        console.log("Trying getUserLockIds method...")
        const lockIds = await stakingContract.getUserLockIds(userAddress)
        console.log("Lock IDs:", lockIds)

        if (lockIds && lockIds.length > 0) {
          const lockPromises = lockIds.map((id) =>
            stakingContract.getLockInfo(id).catch((err) => {
              console.warn(`Failed to get info for lock ID ${id}:`, err)
              return null
            }),
          )

          const lockDetails = await Promise.all(lockPromises)
          const validLocks = lockDetails
            .filter((lock) => lock !== null)
            .map((lock, index) => {
              // Format the lock data
              return {
                id: lockIds[index].toString(),
                amount: lock.amount || lock[1] || 0,
                startTime: Number(lock.startTime || lock.start || lock[2] || 0),
                endTime: Number(lock.endTime || lock.end || lock[3] || 0),
                lockPeriod: Math.floor(
                  (Number(lock.endTime || lock.end || lock[3] || 0) -
                    Number(lock.startTime || lock.start || lock[2] || 0)) /
                    (24 * 60 * 60),
                ),
              }
            })

          console.log("Successfully fetched locks using IDs:", validLocks)
          return validLocks
        }
      } catch (error) {
        console.warn("Failed to get lock IDs:", error)
      }

      // If getting lock IDs failed, try the direct methods
      const methods = ["getUserLocks", "getLockPositions", "getLocks", "mapUserLocks", "getUserLockInfo"]

      for (const method of methods) {
        try {
          console.log(`Trying ${method} method...`)
          const result = await stakingContract[method](userAddress)
          console.log(`${method} result:`, result)

          if (result && (Array.isArray(result) || typeof result === "object")) {
            // Process the result to normalize it
            const processedLocks = Array.isArray(result) ? result : Object.values(result)

            if (processedLocks.length > 0) {
              // Format the locks
              const formattedLocks = processedLocks.map((lock, index) => {
                const id = lock.id || lock.nonce || lock[0] || index.toString()
                const amount = lock.amount || lock[1] || 0
                const startTime = lock.startTime || lock.start || lock[2] || 0
                const endTime = lock.endTime || lock.end || lock[3] || 0

                return {
                  id: id.toString(),
                  amount,
                  startTime: Number(startTime),
                  endTime: Number(endTime),
                  lockPeriod: Math.floor((Number(endTime) - Number(startTime)) / (24 * 60 * 60)),
                }
              })

              console.log(`Successfully fetched locks using ${method}:`, formattedLocks)
              return formattedLocks
            }
          }
        } catch (error) {
          console.warn(`${method} failed:`, error)
        }
      }

      console.log("All methods failed to fetch locks, returning empty array")
      return []
    } catch (error) {
      console.error("Error in fetchUserLocksImproved:", error)
      return []
    }
  }

  // Update the refreshBalances function to use the improved lock fetching
  const refreshBalances = useCallback(async () => {
    if (!account) {
      console.warn("Cannot refresh balances: No account connected")
      return
    }

    if (isRefreshing) {
      console.log("Already refreshing balances, skipping duplicate request")
      return
    }

    setIsRefreshing(true)

    try {
      // Prioritize improved lock fetching for more reliable results
      console.log("Directly fetching locks from blockchain using improved method...")
      try {
        const directLocks = await fetchUserLocksImproved(account)
        if (directLocks && directLocks.length > 0) {
          console.log("Found locks via improved fetch:", directLocks)
          setUserLocks(directLocks)
        } else {
          console.log("No locks found via improved fetch")
        }
      } catch (error) {
        console.error("Error in improved lock fetch:", error)
      }

      // Continue with the rest of the balance fetching...
      if (provider) {
        const signer = await provider.getSigner()
        const freshOpusToken = new ethers.Contract(OPUS_TOKEN_ADDRESS, OPUS_TOKEN_ABI, signer)
        const freshStakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

        // Update the contracts with fresh instances
        setContracts({
          opusToken: freshOpusToken,
          stakingContract: freshStakingContract,
        })

        // Fetch balances with the fresh contracts
        await fetchBalances(freshOpusToken, freshStakingContract, account)
      } else {
        console.warn("No provider available, using existing contracts")
        await fetchBalances(contracts.opusToken, contracts.stakingContract, account)
      }
    } catch (error) {
      console.error("Error during balance refresh:", error)
      toast({
        title: "Refresh Error",
        description: "Failed to refresh your balances. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [account, contracts.opusToken, contracts.stakingContract, provider, isRefreshing])

  return (
    <BlockchainContext.Provider
      value={{
        account,
        isConnected: !!account,
        isCorrectNetwork,
        connect,
        disconnect,
        refreshBalances,
        balances,
        isLoading,
        contracts,
        walletType,
        provider,
        userLocks,
        stake,
        unstake,
        lock,
        unlock,
        claimRewards,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  )
}

export function useBlockchain() {
  const context = useContext(BlockchainContext)
  if (context === undefined) {
    throw new Error("useBlockchain must be used within a BlockchainProvider")
  }
  return context
}

// Get read-only contract instances (for use without connecting wallet)
export function getReadOnlyContracts() {
  return getWorkingProvider().then((provider) => {
    const opusToken = new ethers.Contract(OPUS_TOKEN_ADDRESS, OPUS_TOKEN_ABI, provider)
    const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

    return { opusToken, stakingContract }
  })
}

