"use client"

import { useState, useEffect } from "react"
import { executeQuery } from "@/lib/graphql-client"

// Token contract address
const TOKEN_CONTRACT_ADDRESS = "0x64aa120986030627C3E1419B09ce604e21B9B0FE"

// Define the expected response type
interface TokenData {
  token: {
    id: string
    name: string
    symbol: string
    totalSupply: string
    decimals: number
    holderCount: number
    holders: {
      totalCount: number
      edges: Array<{
        node: {
          address: string
          balance: string
        }
      }>
    }
  }
}

export function useTokenGraphQL() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTokenData = async () => {
      setLoading(true)
      setError(null)

      try {
        // GraphQL query for token data
        const query = `
          query GetTokenData($tokenAddress: ID!) {
            token(id: $tokenAddress) {
              id
              name
              symbol
              totalSupply
              decimals
              holderCount
              holders {
                totalCount
                edges {
                  node {
                    address
                    balance
                  }
                }
              }
            }
          }
        `

        // Execute the query with variables
        const data = await executeQuery<TokenData>(query, {
          tokenAddress: TOKEN_CONTRACT_ADDRESS.toLowerCase(),
        })

        setTokenData(data)
        console.log("GraphQL token data:", data)
      } catch (error) {
        console.error("Error fetching token data via GraphQL:", error)
        setError("Failed to fetch token data via GraphQL.")
      } finally {
        setLoading(false)
      }
    }

    fetchTokenData()
  }, [])

  // Extract and format the holder count
  const holderCount = tokenData?.token?.holderCount || tokenData?.token?.holders?.totalCount || null

  // Extract and format top holders
  const topHolders =
    tokenData?.token?.holders?.edges?.map((edge) => ({
      address: edge.node.address,
      balance: edge.node.balance,
    })) || []

  return {
    tokenData,
    holderCount,
    topHolders,
    loading,
    error,
  }
}

