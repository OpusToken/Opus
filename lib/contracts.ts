import { ethers } from "ethers"

// Contract addresses
export const OPUS_TOKEN_ADDRESS = "0x64aa120986030627C3E1419B09ce604e21B9B0FE"
export const STAKING_CONTRACT_ADDRESS = "0x7E36b5C2B8D308C651F368DAf2053612E52D1dAe"

// ABIs
export const OPUS_TOKEN_ABI = [
  // ERC20 standard functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
  // Custom functions
  "function burn(uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
]

export const STAKING_CONTRACT_ABI = [
  // Staking functions
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function withdraw(uint256 amount) external", // Alternative name for unstake
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",

  // Locking functions
  "function lock(uint256 amount, uint256 period) external",
  "function unlock(uint256[] lockID) external",
  "function claimRewards() external",
  "function claim() external", // Alternative name for claimRewards

  // View functions - with alternatives
  "function getStakedBalance(address account) external view returns (uint256)",
  "function stakedBalanceOf(address account) external view returns (uint256)", // Alternative
  "function balanceOf(address account) external view returns (uint256)", // Another alternative
  "function getUserInfo(address account) external view returns (uint256, uint256, uint256, uint256)", // Common in MasterChef contracts
  "function userInfo(address account) external view returns (uint256, uint256, uint256, uint256)", // Common in MasterChef contracts
  "function mapUserInfo(address) external view returns (uint256 amount, uint256 rewardDebt, uint256 startTime, uint256 claimed, uint256 lockClaimed, uint256 locked, uint256 pendingToClaimed)",

  "function getLockedBalance(address account) external view returns (uint256)",
  "function getUserLockedAmount(address account) external view returns (uint256)", // Alternative
  "function lockedBalanceOf(address account) external view returns (uint256)", // Another alternative

  "function getUserLocks(address account) external view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
  "function getUserLockInfo(address account) external view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])", // Alternative
  "function mapUserLocks(address) external view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
  "function getUserLockIds(address account) external view returns (uint256[])",
  "function getLockInfo(uint256 lockId) external view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate))",
  "function getLockPositions(address account) external view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
  "function getLocks(address account) external view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate)[])",
  "function getUserLockIds(address account) external view returns (uint256[])",
  "function getLockInfo(uint256 lockId) external view returns (tuple(uint256 id, uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardRate))",

  "function getAvailableRewards(address account) external view returns (uint256)",
  "function getPendingRewards(address account) external view returns (uint256)", // Alternative
  "function earned(address account) external view returns (uint256)", // Another alternative
  "function pendingReward(address account) external view returns (uint256)", // Common in MasterChef contracts

  "function getTotalStaked() external view returns (uint256)",
  "function totalStaked() external view returns (uint256)", // Alternative

  "function getTotalLocked() external view returns (uint256)",
  "function totalLocked() external view returns (uint256)", // Alternative
  "function stakingInfo(address user, address pool) external view returns (uint256 stakedLP, uint256 stakedUFO, uint256 rewardExcluded, uint256 pendingReward, address pool)",
  "function withdrawReward() external",
  "function withdrawRewardLock(uint256[] lockID) external",
  "function updatePool(uint256 amount) external",

  // Add mapping access functions
  "function mapUserInfoLock(address, uint256) external view returns (uint256 amount, uint256 startTime, uint256 endTime, uint256 rewardDebt)",
]

// Get contract instances with signer
export async function getContracts(provider: ethers.BrowserProvider) {
  const signer = await provider.getSigner()

  const opusToken = new ethers.Contract(OPUS_TOKEN_ADDRESS, OPUS_TOKEN_ABI, signer)
  const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)

  return { opusToken, stakingContract }
}

// Get read-only contract instances (for use without connecting wallet)
export function getReadOnlyContracts() {
  // Use JsonRpcProvider for ethers v6
  const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")

  const opusToken = new ethers.Contract(OPUS_TOKEN_ADDRESS, OPUS_TOKEN_ABI, provider)
  const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

  return { opusToken, stakingContract }
}

// Function to directly query staking balance using multiple methods
export async function getStakedBalance(userAddress: string) {
  const provider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com")
  const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

  console.log("Attempting to get staked balance for:", userAddress)

  // Try all possible methods to get staked balance
  const methods = ["getStakedBalance", "stakedBalanceOf", "balanceOf", "getUserInfo", "userInfo"]

  for (const method of methods) {
    try {
      console.log(`Trying method: ${method}`)
      if (method === "getUserInfo" || method === "userInfo") {
        const result = await stakingContract[method](userAddress)
        console.log(`${method} result:`, result)
        // For struct returns, the staked amount is typically the first value
        return result[0] || ethers.parseUnits("0", 18)
      } else {
        const balance = await stakingContract[method](userAddress)
        console.log(`${method} result:`, balance.toString())
        return balance
      }
    } catch (error) {
      console.warn(`Method ${method} failed:`, error)
    }
  }

  console.error("All methods failed to get staked balance")
  return ethers.parseUnits("0", 18)
}

