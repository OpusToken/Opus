import { ethers } from "ethers"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "./contracts"

// Fallback RPC URLs for PulseChain
const RPC_URLS = [
  "https://rpc.pulsechain.com",
  "https://pulsechain.publicnode.com",
  "https://rpc-pulsechain.g4mm4.io",
  "https://pulsechain-rpc.publicnode.com",
]

// Get a working provider with fallbacks
export const getWorkingProvider = async () => {
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
  throw new Error("All RPC endpoints failed. Please try again later.")
}

// Direct function to query user locks from blockchain
export const queryUserLocks = async (userAddress: string) => {
  if (!userAddress) {
    throw new Error("No user address provided")
  }

  console.log("Querying user locks directly from blockchain for:", userAddress)

  try {
    const provider = await getWorkingProvider()
    const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

    // Try multiple methods to get locks
    const methods = ["getUserLocks", "getLockPositions", "getLocks", "getUserLockInfo", "mapUserLocks"]

    for (const method of methods) {
      try {
        console.log(`Trying ${method} method...`)
        const result = await stakingContract[method](userAddress)

        if (result && (Array.isArray(result) || typeof result === "object")) {
          console.log(`${method} succeeded:`, result)
          return result
        }
      } catch (error) {
        console.warn(`${method} failed:`, error)
      }
    }

    // Try getting lock IDs and then fetching each lock
    try {
      const lockIds = await stakingContract.getUserLockIds(userAddress)

      if (lockIds && lockIds.length > 0) {
        console.log("Found lock IDs:", lockIds)

        const locks = await Promise.all(
          lockIds.map((id) =>
            stakingContract.getLockInfo(id).catch((err) => {
              console.warn(`Failed to get lock info for ID ${id}:`, err)
              return null
            }),
          ),
        )

        const validLocks = locks.filter((lock) => lock !== null)
        if (validLocks.length > 0) {
          console.log("Successfully fetched locks by ID:", validLocks)
          return validLocks
        }
      }
    } catch (error) {
      console.warn("Failed to get lock IDs:", error)
    }

    // If all methods fail, return empty array
    return []
  } catch (error) {
    console.error("Error querying user locks:", error)
    throw error
  }
}

// Format lock data for display
export const formatLockData = (locks: any[]) => {
  if (!locks || !Array.isArray(locks)) return []

  return locks
    .filter((lock) => lock !== null)
    .map((lock) => {
      try {
        // Extract ID with fallbacks, check for "nonce"
        const id = lock.id || lock.nonce || lock[0] || lock[5] || "0"

        // Extract amount with fallbacks
        let amount
        try {
          amount = lock.amount ? ethers.formatUnits(lock.amount, 18) : lock[1] ? ethers.formatUnits(lock[1], 18) : "0"
        } catch (e) {
          amount = (lock.amount || lock[1] || 0).toString()
        }

        // Extract timestamps with fallbacks
        const startTime = Number(lock.startTime || lock.start || lock[2] || Date.now() / 1000 - 86400)
        const endTime = Number(lock.endTime || lock.end || lock[3] || Date.now() / 1000 + 86400 * 90)

        // Calculate or extract lock period
        const lockPeriod =
          lock.lockPeriod || lock.period || lock[4] || Math.floor((endTime - startTime) / (24 * 60 * 60)) || 90

        return {
          id: id.toString(),
          amount,
          startTime,
          endTime,
          lockPeriod: Number(lockPeriod),
        }
      } catch (error) {
        console.error("Error formatting lock:", error, lock)
        return null
      }
    })
    .filter(Boolean) // Remove any null entries
}

