"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"

// Get token contract address from environment variable with fallback
const TOKEN_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS || "0x64aa120986030627C3E1419B09ce604e21B9B0FE"

// Staking contract address
const STAKING_CONTRACT_ADDRESS = "0x7E36b5C2B8D308C651F368DAf2053612E52D1dAe"

// Fallback RPC URLs for PulseChain
const RPC_URLS = ["https://rpc.pulsechain.com", "https://pulsechain.publicnode.com", "https://rpc-pulsechain.g4mm4.io"]

// PulseChain REST API endpoint (if available)
const PULSECHAIN_API_BASE = "https://scan.pulsechain.com/api"

export function usePulsechainHolders() {
  const [tokenStats, setTokenStats] = useState({
    name: "Opus Token",
    symbol: "OPUS",
    totalSupply: "1000000000",
    decimals: 18,
    holderCount: null,
    stakerCount: null,
    circulatingSupply: "988000000",
    burnedSupply: "12000000",
    stakedSupply: null,
    lockedSupply: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTokenStats = async () => {
      setLoading(true)
      setError(null)

      try {
        // Method 1: Try PulseChain REST API
        const restApiStats = await fetchFromRestApi()
        if (restApiStats) {
          setTokenStats(restApiStats)
          setLoading(false)
          return
        }

        // Method 2: Use RPC to get basic token info and estimate the rest
        const rpcStats = await fetchFromRPC()
        if (rpcStats) {
          setTokenStats(rpcStats)
          setLoading(false)
          return
        }

        // If all methods fail, use default values but show an error
        setError("Could not fetch live token data. Some values may be unavailable.")
      } catch (error) {
        console.error("Error fetching token statistics:", error)
        setError("Failed to fetch token statistics. Some values may be unavailable.")
      } finally {
        setLoading(false)
      }
    }

    fetchTokenStats()
  }, [])

  // Method 1: Fetch from REST API
  const fetchFromRestApi = async () => {
    try {
      console.log("Attempting to fetch from PulseChain REST API...")

      // Try multiple API endpoints and formats that might be supported
      const apiEndpoints = [
        `${PULSECHAIN_API_BASE}/v2/tokens/${TOKEN_CONTRACT_ADDRESS}`,
        `${PULSECHAIN_API_BASE}/tokens/${TOKEN_CONTRACT_ADDRESS}`,
        `${PULSECHAIN_API_BASE}/token/${TOKEN_CONTRACT_ADDRESS}`,
      ]

      let tokenResponse = null

      // Try each endpoint until one works
      for (const endpoint of apiEndpoints) {
        try {
          const response = await fetch(endpoint)
          if (response.ok) {
            tokenResponse = await response.json()
            console.log("Successfully fetched token data from:", endpoint)
            break
          }
        } catch (e) {
          console.warn(`API endpoint ${endpoint} failed:`, e)
        }
      }

      if (!tokenResponse) {
        console.warn("All REST API endpoints failed")
        return null
      }

      // Try to fetch holder count from various possible endpoints
      const holderCountEndpoints = [
        `${PULSECHAIN_API_BASE}/v2/tokens/${TOKEN_CONTRACT_ADDRESS}/token-holders-count`,
        `${PULSECHAIN_API_BASE}/tokens/${TOKEN_CONTRACT_ADDRESS}/holders/count`,
        `${PULSECHAIN_API_BASE}/token/${TOKEN_CONTRACT_ADDRESS}/holders-count`,
      ]

      let holderCount = null

      for (const endpoint of holderCountEndpoints) {
        try {
          const response = await fetch(endpoint)
          if (response.ok) {
            const data = await response.json()
            if (data.holder_count || data.count) {
              holderCount = data.holder_count || data.count
              console.log("Successfully fetched holder count from:", endpoint, holderCount)
              break
            }
          }
        } catch (e) {
          console.warn(`Holder count endpoint ${endpoint} failed:`, e)
        }
      }

      // If we couldn't get holder count from API, try to get it from blockchain
      if (!holderCount) {
        holderCount = await fetchHolderCountFromBlockchain()
      }

      // Extract token data with fallbacks for different API response structures
      const name = tokenResponse.name || tokenResponse.token?.name || "Opus Token"
      const symbol = tokenResponse.symbol || tokenResponse.token?.symbol || "OPUS"
      const decimals = tokenResponse.decimals || tokenResponse.token?.decimals || 18

      // Handle different ways total supply might be represented
      let totalSupply = "1000000000000000000000000000" // Default in wei
      if (tokenResponse.total_supply) {
        totalSupply = tokenResponse.total_supply
      } else if (tokenResponse.totalSupply) {
        totalSupply = tokenResponse.totalSupply
      } else if (tokenResponse.token?.total_supply) {
        totalSupply = tokenResponse.token.total_supply
      }

      // Handle different ways burned amount might be represented
      let burnedSupply = "12000000000000000000000000" // Default in wei
      if (tokenResponse.burned_token_amount) {
        burnedSupply = tokenResponse.burned_token_amount
      } else if (tokenResponse.burnedAmount) {
        burnedSupply = tokenResponse.burnedAmount
      } else if (tokenResponse.token?.burned_amount) {
        burnedSupply = tokenResponse.token.burned_amount
      }

      // Format values
      const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals)
      const burnedSupplyFormatted = ethers.formatUnits(burnedSupply, decimals)
      const circulatingSupplyFormatted = (Number(totalSupplyFormatted) - Number(burnedSupplyFormatted)).toString()

      // Get staker count from blockchain
      const stakerCount = await fetchStakerCountFromBlockchain()

      // Get staked and locked supply
      const { stakedSupply, lockedSupply } = await fetchStakingData(totalSupplyFormatted)

      return {
        name,
        symbol,
        totalSupply: totalSupplyFormatted,
        decimals,
        holderCount,
        stakerCount,
        circulatingSupply: circulatingSupplyFormatted,
        burnedSupply: burnedSupplyFormatted,
        stakedSupply,
        lockedSupply,
      }
    } catch (error) {
      console.error("REST API fetch failed:", error)
      return null
    }
  }

  // Method 2: Use RPC to get basic token info
  const fetchFromRPC = async () => {
    try {
      console.log("Attempting to fetch from RPC...")

      // Connect to PulseChain
      let provider = null
      for (const rpcUrl of RPC_URLS) {
        try {
          const tempProvider = new ethers.JsonRpcProvider(rpcUrl)
          await tempProvider.getBlockNumber() // Test the connection
          provider = tempProvider
          console.log(`Connected to RPC: ${rpcUrl}`)
          break
        } catch (error) {
          console.warn(`RPC ${rpcUrl} failed, trying next...`)
        }
      }

      if (!provider) throw new Error("All RPC endpoints failed")

      // Create contract instance with minimal ABI
      const tokenContract = new ethers.Contract(
        TOKEN_CONTRACT_ADDRESS,
        [
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function totalSupply() view returns (uint256)",
          "function decimals() view returns (uint8)",
          "function balanceOf(address) view returns (uint256)",
        ],
        provider,
      )

      // Get token info with proper error handling for each call
      let name = "Opus Token"
      try {
        name = await tokenContract.name()
        console.log("Successfully fetched token name:", name)
      } catch (e) {
        console.warn("Failed to fetch token name:", e)
      }

      let symbol = "OPUS"
      try {
        symbol = await tokenContract.symbol()
        console.log("Successfully fetched token symbol:", symbol)
      } catch (e) {
        console.warn("Failed to fetch token symbol:", e)
      }

      let decimals = 18
      try {
        decimals = await tokenContract.decimals()
        console.log("Successfully fetched token decimals:", decimals)
      } catch (e) {
        console.warn("Failed to fetch token decimals:", e)
      }

      let totalSupply = ethers.parseUnits("1000000000", decimals)
      try {
        totalSupply = await tokenContract.totalSupply()
        console.log("Successfully fetched total supply:", totalSupply.toString())
      } catch (e) {
        console.warn("Failed to fetch total supply:", e)
      }

      // Get burn address balance
      let burnedSupply = ethers.parseUnits("12000000", decimals)
      try {
        // Try multiple known burn addresses
        const burnAddresses = [
          "0x0000000000000000000000000000000000000000", // Zero address
          "0x0000000000000000000000000000000000000369", // PulseChain burn address
          "0x000000000000000000000000000000000000dEaD", // Common burn address
        ]

        let totalBurned = ethers.parseUnits("0", decimals)

        for (const address of burnAddresses) {
          try {
            const balance = await tokenContract.balanceOf(address)
            console.log(`Balance of burn address ${address}:`, balance.toString())
            totalBurned = totalBurned + balance
          } catch (e) {
            console.warn(`Failed to fetch balance of ${address}:`, e)
          }
        }

        if (totalBurned > 0) {
          burnedSupply = totalBurned
        }
      } catch (e) {
        console.warn("Failed to fetch burned supply:", e)
      }

      const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals)
      const burnedSupplyFormatted = ethers.formatUnits(burnedSupply, decimals)

      // Get holder count from blockchain
      const holderCount = await fetchHolderCountFromBlockchain()

      // Get staker count from blockchain
      const stakerCount = await fetchStakerCountFromBlockchain()

      // Get staked and locked supply
      const { stakedSupply, lockedSupply } = await fetchStakingData(totalSupplyFormatted)

      // Calculate circulating supply
      const circulatingSupply = (BigInt(totalSupply) - BigInt(burnedSupply)).toString()
      const circulatingSupplyFormatted = ethers.formatUnits(circulatingSupply, decimals)

      return {
        name,
        symbol,
        totalSupply: totalSupplyFormatted,
        decimals,
        holderCount,
        stakerCount,
        circulatingSupply: circulatingSupplyFormatted,
        burnedSupply: burnedSupplyFormatted,
        stakedSupply,
        lockedSupply,
      }
    } catch (error) {
      console.error("RPC fetch failed:", error)
      return null
    }
  }

  // Helper method to fetch staking data
  const fetchStakingData = async (totalSupply: string) => {
    try {
      console.log("Attempting to fetch staking data...")

      // Connect to PulseChain
      let provider = null
      for (const rpcUrl of RPC_URLS) {
        try {
          const tempProvider = new ethers.JsonRpcProvider(rpcUrl)
          await tempProvider.getBlockNumber() // Test the connection
          provider = tempProvider
          break
        } catch (error) {
          console.warn(`RPC ${rpcUrl} failed, trying next...`)
        }
      }

      if (!provider) return { stakedSupply: null, lockedSupply: null }

      // Create staking contract instance with multiple possible methods
      const stakingContract = new ethers.Contract(
        STAKING_CONTRACT_ADDRESS,
        [
          // Methods to get total staked
          "function getTotalStaked() view returns (uint256)",
          "function totalStaked() view returns (uint256)",
          "function totalSupplyStaked() view returns (uint256)",
          "function stakedTotal() view returns (uint256)",
          "function getStakedTotal() view returns (uint256)",

          // Methods to get total locked
          "function getTotalLocked() view returns (uint256)",
          "function totalLocked() view returns (uint256)",
          "function lockedTotal() view returns (uint256)",
          "function getLockedTotal() view returns (uint256)",
          "function totalSupplyLocked() view returns (uint256)",
        ],
        provider,
      )

      // Try to get total staked using multiple methods
      let stakedSupply = null
      const stakedMethods = ["getTotalStaked", "totalStaked", "totalSupplyStaked", "stakedTotal", "getStakedTotal"]

      for (const method of stakedMethods) {
        try {
          console.log(`Trying ${method} method to get staked supply...`)
          const result = await stakingContract[method]()
          console.log(`${method} result:`, result.toString())
          stakedSupply = ethers.formatUnits(result, 18)
          break
        } catch (e) {
          console.warn(`${method} failed:`, e)
        }
      }

      // Try to get total locked using multiple methods
      let lockedSupply = null
      const lockedMethods = ["getTotalLocked", "totalLocked", "lockedTotal", "getLockedTotal", "totalSupplyLocked"]

      for (const method of lockedMethods) {
        try {
          console.log(`Trying ${method} method to get locked supply...`)
          const result = await stakingContract[method]()
          console.log(`${method} result:`, result.toString())
          lockedSupply = ethers.formatUnits(result, 18)
          break
        } catch (e) {
          console.warn(`${method} failed:`, e)
        }
      }

      return { stakedSupply, lockedSupply }
    } catch (error) {
      console.error("Failed to fetch staking data:", error)
      return { stakedSupply: null, lockedSupply: null }
    }
  }

  // Helper method to fetch holder count from blockchain
  const fetchHolderCountFromBlockchain = async () => {
    try {
      console.log("Attempting to fetch holder count from blockchain...")

      // Connect to PulseChain
      let provider = null
      for (const rpcUrl of RPC_URLS) {
        try {
          const tempProvider = new ethers.JsonRpcProvider(rpcUrl)
          await tempProvider.getBlockNumber() // Test the connection
          provider = tempProvider
          break
        } catch (error) {
          console.warn(`RPC ${rpcUrl} failed, trying next...`)
        }
      }

      if (!provider) return null

      // Try to get holder count from Transfer events
      // This is a more accurate but expensive method
      try {
        // Create contract instance with Transfer event
        const tokenContract = new ethers.Contract(
          TOKEN_CONTRACT_ADDRESS,
          ["event Transfer(address indexed from, address indexed to, uint256 value)"],
          provider,
        )

        // Get the current block number
        const currentBlock = await provider.getBlockNumber()

        // Look back a limited number of blocks (e.g., 100,000) to find unique addresses
        const fromBlock = Math.max(0, currentBlock - 100000)

        console.log(`Fetching Transfer events from block ${fromBlock} to ${currentBlock}...`)

        // Get Transfer events
        const events = await tokenContract.queryFilter(tokenContract.filters.Transfer(), fromBlock, currentBlock)

        console.log(`Found ${events.length} Transfer events`)

        // Extract unique addresses
        const uniqueAddresses = new Set<string>()

        for (const event of events) {
          if (event.args && event.args.from) uniqueAddresses.add(event.args.from.toLowerCase())
          if (event.args && event.args.to) uniqueAddresses.add(event.args.to.toLowerCase())
        }

        // Remove burn addresses
        const burnAddresses = [
          "0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000369",
          "0x000000000000000000000000000000000000dead",
        ]

        burnAddresses.forEach((address) => uniqueAddresses.delete(address.toLowerCase()))

        console.log(`Found ${uniqueAddresses.size} unique addresses`)

        // If we found a reasonable number of holders, return it
        if (uniqueAddresses.size > 0) {
          return uniqueAddresses.size
        }
      } catch (e) {
        console.warn("Failed to get holder count from Transfer events:", e)
      }

      // If the above method fails, return null to indicate we couldn't fetch the data
      return null
    } catch (error) {
      console.error("Failed to fetch holder count from blockchain:", error)
      return null
    }
  }

  // Helper method to fetch staker count from blockchain
  const fetchStakerCountFromBlockchain = async () => {
    try {
      console.log("Attempting to fetch staker count from blockchain...")

      // Connect to PulseChain
      let provider = null
      for (const rpcUrl of RPC_URLS) {
        try {
          const tempProvider = new ethers.JsonRpcProvider(rpcUrl)
          await tempProvider.getBlockNumber() // Test the connection
          provider = tempProvider
          break
        } catch (error) {
          console.warn(`RPC ${rpcUrl} failed, trying next...`)
        }
      }

      if (!provider) return null

      // Try different methods to get staker count

      // Method 1: Try to get staker count directly from contract state
      try {
        // Create contract instance with staking contract methods
        const stakingContract = new ethers.Contract(
          STAKING_CONTRACT_ADDRESS,
          [
            "function getStakerCount() view returns (uint256)",
            "function stakerCount() view returns (uint256)",
            "function getTotalStakers() view returns (uint256)",
            "function totalStakers() view returns (uint256)",
            "function stakers() view returns (uint256)",
          ],
          provider,
        )

        // Try different methods to get staker count
        for (const method of ["getStakerCount", "stakerCount", "getTotalStakers", "totalStakers", "stakers"]) {
          try {
            const count = await stakingContract[method]()
            console.log(`Successfully got staker count using ${method}:`, count.toString())
            return Number(count)
          } catch (e) {
            console.warn(`Failed to get staker count using ${method}:`, e)
          }
        }
      } catch (e) {
        console.warn("Failed to get staker count from contract state:", e)
      }

      // Method 2: Try to get staker count from staking contract events
      try {
        // Create contract instance with staking events
        const stakingContract = new ethers.Contract(
          STAKING_CONTRACT_ADDRESS,
          [
            "event Staked(address indexed user, uint256 amount)",
            "event Unstaked(address indexed user, uint256 amount)",
            "event Deposit(address indexed user, uint256 amount)",
            "event Withdraw(address indexed user, uint256 amount)",
          ],
          provider,
        )

        // Get the current block number
        const currentBlock = await provider.getBlockNumber()

        // Look back a limited number of blocks
        const fromBlock = Math.max(0, currentBlock - 100000)

        console.log(`Fetching staking events from block ${fromBlock} to ${currentBlock}...`)

        // Get all possible staking events
        const stakedEvents = await stakingContract
          .queryFilter(stakingContract.filters.Staked(), fromBlock, currentBlock)
          .catch(() => [])

        const depositEvents = await stakingContract
          .queryFilter(stakingContract.filters.Deposit(), fromBlock, currentBlock)
          .catch(() => [])

        // Get all possible unstaking events
        const unstakedEvents = await stakingContract
          .queryFilter(stakingContract.filters.Unstaked(), fromBlock, currentBlock)
          .catch(() => [])

        const withdrawEvents = await stakingContract
          .queryFilter(stakingContract.filters.Withdraw(), fromBlock, currentBlock)
          .catch(() => [])

        console.log(
          `Found ${stakedEvents.length} Staked events, ${depositEvents.length} Deposit events, ${unstakedEvents.length} Unstaked events, and ${withdrawEvents.length} Withdraw events`,
        )

        // Extract unique staker addresses
        const stakerAddresses = new Set<string>()

        // Add addresses from staking events
        for (const event of [...stakedEvents, ...depositEvents]) {
          if (event.args && event.args.user) stakerAddresses.add(event.args.user.toLowerCase())
        }

        // Remove addresses that have fully unstaked
        // This is a simplification - in reality, we'd need to track balances
        for (const event of [...unstakedEvents, ...withdrawEvents]) {
          if (event.args && event.args.user) {
            // For simplicity, we're just removing addresses that have unstaked
            // In a real implementation, we'd check if they've fully unstaked
            stakerAddresses.delete(event.args.user.toLowerCase())
          }
        }

        console.log(`Found ${stakerAddresses.size} unique staker addresses from events`)

        // If we found a reasonable number of stakers, return it
        if (stakerAddresses.size > 0) {
          return stakerAddresses.size
        }
      } catch (e) {
        console.warn("Failed to get staker count from events:", e)
      }

      // Method 3: Try to analyze token balances in the staking contract
      try {
        // Create token contract instance
        const tokenContract = new ethers.Contract(
          TOKEN_CONTRACT_ADDRESS,
          ["function balanceOf(address) view returns (uint256)"],
          provider,
        )

        // Get staking contract balance
        const stakingBalance = await tokenContract.balanceOf(STAKING_CONTRACT_ADDRESS)
        console.log(`Staking contract balance: ${ethers.formatUnits(stakingBalance, 18)} tokens`)

        // If staking contract has tokens, estimate staker count based on average stake
        if (stakingBalance > 0) {
          // Assume average stake is 10,000 tokens
          const averageStake = ethers.parseUnits("10000", 18)
          const estimatedStakers = Number(stakingBalance) / Number(averageStake)
          const roundedStakers = Math.max(1, Math.round(estimatedStakers))

          console.log(`Estimated staker count based on contract balance: ${roundedStakers}`)
          return roundedStakers
        }
      } catch (e) {
        console.warn("Failed to analyze token balances:", e)
      }

      // If all methods fail, return null to indicate we couldn't fetch the data
      return null
    } catch (error) {
      console.error("Failed to fetch staker count from blockchain:", error)
      return null
    }
  }

  return { tokenStats, loading, error }
}

