import { ethers } from "ethers"
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI } from "@/lib/contracts"

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

// Function to fetch locks directly from contract, based on the contract structure
export const fetchUserLocksFromContract = async (userAddress: string) => {
  if (!userAddress) {
    throw new Error("No user address provided")
  }

  console.log("Fetching locks for address:", userAddress)

  try {
    const provider = await getWorkingProvider()
    const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

    // STEP 1: Get lock IDs for the user
    console.log("Getting lock IDs using getUserLockIds...")
    const lockIds = await stakingContract.getUserLockIds(userAddress)
    console.log(
      `Found ${lockIds.length} lock IDs:`,
      lockIds.map((id) => id.toString()),
    )

    if (!lockIds || lockIds.length === 0) {
      console.log("No lock IDs found")
      return []
    }

    // STEP 2: Get lock details for each ID directly from the mapUserInfoLock mapping
    // Note: Since we can't access the mapping directly, we'll use the getLockInfo function
    console.log("Getting details for each lock ID...")
    const lockPromises = lockIds.map(async (id) => {
      try {
        console.log(`Getting info for lock ID ${id.toString()}...`)
        const lockInfo = await stakingContract.getLockInfo(id)
        console.log(`Lock info for ID ${id.toString()}:`, lockInfo)

        // Format the lock data based on contract structure
        return {
          id: id.toString(),
          amount: lockInfo.amount || lockInfo[1] || 0n,
          startTime: Number(lockInfo.startTime || lockInfo[2] || 0),
          endTime: Number(lockInfo.endTime || lockInfo[3] || 0),
          lockPeriod: Math.floor(
            (Number(lockInfo.endTime || lockInfo[3] || 0) - Number(lockInfo.startTime || lockInfo[2] || 0)) /
              (24 * 60 * 60),
          ),
          // Skip rewardDebt as it's usually not needed for display
        }
      } catch (err) {
        console.error(`Error getting lock info for ID ${id.toString()}:`, err)
        return null
      }
    })

    const lockDetails = await Promise.all(lockPromises)
    const validLocks = lockDetails.filter(
      (lock) => lock !== null && (typeof lock.amount === "bigint" ? lock.amount > 0n : Number(lock.amount) > 0),
    )

    console.log("Successfully retrieved locks:", validLocks)
    return validLocks
  } catch (err) {
    console.error("Error fetching user locks:", err)
    throw err
  }
}

// Apply the lock fetch fix to the global context
export const applyLockFetchFix = () => {
  if (typeof window !== "undefined") {
    // Create a patched version of the fetchBalances function
    window.fetchBalancesPatch = async (opusToken: any, stakingContract: any, userAddress: string) => {
      // Use the original function for most operations
      const originalFetchBalances = window.fetchBalances
      if (!originalFetchBalances) {
        console.error("Original fetchBalances function not found")
        return
      }

      // Call the original function to get balances
      await originalFetchBalances(opusToken, stakingContract, userAddress)

      // Then override the lock fetching
      try {
        console.log("Applying lock fetch fix...")
        const locks = await fetchUserLocksFromContract(userAddress)

        // Update locks in UI via window.setUserLocks
        if (window.setUserLocks) {
          window.setUserLocks(locks)
          console.log("Applied lock fetch fix successfully:", locks)
        } else {
          console.error("setUserLocks function not found in window")
        }
      } catch (err) {
        console.error("Error in lock fetch fix:", err)
      }
    }

    // Create a patched unlock function that uses an array of IDs
    window.unlockPatch = async (lockId: string) => {
      console.log("Using patched unlock function with array parameter for ID:", lockId)

      try {
        // Get the original provider and contract
        const provider = await getWorkingProvider()
        const signer = await new ethers.BrowserProvider(window.ethereum).getSigner()
        const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

        // Call the unlock function with an array of IDs
        const unlockTx = await stakingContract.unlock([lockId])
        await unlockTx.wait()

        console.log("Unlock transaction successful")
        return true
      } catch (err) {
        console.error("Error in patched unlock function:", err)
        return false
      }
    }
  }
}

