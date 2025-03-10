import { GraphQLClient } from "graphql-request"

// PulseChain GraphQL endpoint - replace with the actual endpoint
const PULSECHAIN_GRAPHQL_ENDPOINT = "https://graph.pulsechain.com/subgraphs/name/pulsechain/blocks"

// Create a GraphQL client instance
export const pulsechainClient = new GraphQLClient(PULSECHAIN_GRAPHQL_ENDPOINT, {
  headers: {
    // Add any required headers here
  },
})

// Helper function to execute GraphQL queries with better error handling
export async function executeQuery<T>(query: string, variables?: Record<string, any>): Promise<T | null> {
  try {
    return await pulsechainClient.request<T>(query, variables)
  } catch (error) {
    console.error("GraphQL query error:", error)
    // Return null instead of throwing to allow fallback mechanisms
    return null
  }
}

