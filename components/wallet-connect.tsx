"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { WalletSelector } from "./wallet-selector"
import { useBlockchain } from "@/contexts/blockchain-context"

export function WalletConnect() {
  const { account, isConnected, isCorrectNetwork, connect, disconnect, walletType } = useBlockchain()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [walletDetected, setWalletDetected] = useState(false)

  // Check if wallet is available on mount
  useEffect(() => {
    const checkWalletAvailability = () => {
      const ethereum =
        window.ethereum || (window as any).rabby || (window as any).trustwallet || (window as any).internetmoney

      setWalletDetected(!!ethereum)

      // Log wallet detection for debugging
      if (ethereum) {
        console.log(
          "Wallet detected:",
          ethereum.isMetaMask
            ? "MetaMask"
            : ethereum === (window as any).rabby
              ? "Rabby"
              : ethereum === (window as any).trustwallet
                ? "Trust Wallet"
                : "Unknown wallet",
        )
      } else {
        console.log("No wallet detected")
      }
    }

    checkWalletAvailability()

    // Check again after a short delay to account for wallets that inject late
    const timer = setTimeout(checkWalletAvailability, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Listen for wallet changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("Accounts changed in WalletConnect:", accounts)
        // The blockchain context will handle the actual account change
      }

      const handleChainChanged = (chainId: string) => {
        console.log("Chain changed in WalletConnect:", chainId)
        // Force refresh the page on chain change
        window.location.reload()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

  // Handle wallet connection
  const handleConnect = async (selectedProvider: any) => {
    if (!selectedProvider) {
      toast({
        title: "Wallet not found",
        description: "Please install a compatible wallet like MetaMask, Rabby, or Trust Wallet.",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Log connection attempt for debugging
      console.log("Attempting to connect to wallet:", selectedProvider)

      // Check if the provider is ready
      if (typeof selectedProvider.request !== "function") {
        throw new Error("Wallet provider is not properly initialized. Please refresh the page and try again.")
      }

      // Try to activate the provider first
      try {
        console.log("Requesting accounts...")
        await selectedProvider.request({ method: "eth_requestAccounts" })
        console.log("Accounts requested successfully")
      } catch (activationError: any) {
        console.error("Provider activation failed:", activationError)

        // If user rejected, show specific message
        if (activationError.code === 4001) {
          throw new Error("You rejected the connection request.")
        }

        // If request already pending, show specific message
        if (activationError.code === -32002) {
          throw new Error("Connection request already pending. Please check your wallet.")
        }

        // Continue anyway, the connect function will handle this
      }

      // Connect to the blockchain context
      await connect(selectedProvider)
    } catch (err: any) {
      console.error("Failed to connect wallet:", err)

      // More specific error messages
      if (err.code === 4001) {
        setError("You rejected the connection request.")
      } else if (err.code === -32002) {
        setError("Connection request already pending. Please check your wallet.")
      } else if (err.message && err.message.includes("network")) {
        setError("Network error. Please check your internet connection and try again.")
      } else {
        setError(err.message || "Failed to connect wallet. Please try again.")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Handle manual refresh
  const handleRefreshConnection = () => {
    if (!window.ethereum) return

    setIsConnecting(true)
    setError(null)

    window.ethereum
      .request({ method: "eth_requestAccounts" })
      .then((accounts: string[]) => {
        if (accounts.length > 0) {
          // The blockchain context will handle the account change
          console.log("Manually refreshed connection, found account:", accounts[0])
        }
      })
      .catch((err: any) => {
        console.error("Failed to refresh connection:", err)
        setError("Failed to refresh connection. Please try disconnecting and connecting again.")
      })
      .finally(() => {
        setIsConnecting(false)
      })
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isConnected && !isCorrectNetwork && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You're connected to the wrong network. Please switch to PulseChain.</AlertDescription>
        </Alert>
      )}

      {!walletDetected && !isConnected && (
        <Alert variant="warning" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No wallet detected. Please install MetaMask, Rabby, or another compatible wallet.
          </AlertDescription>
        </Alert>
      )}

      {isConnected ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neon-green font-medium px-2 py-1 bg-neon-green/10 rounded-md">
            {formatAddress(account)}
          </span>
          <Button
            onClick={() => {
              // First clear localStorage
              localStorage.removeItem("walletConnection")
              localStorage.setItem("walletDisconnected", "true")

              // Then call disconnect
              disconnect()

              // Add a toast notification to confirm disconnection
              toast({
                title: "Wallet disconnected",
                description: "Your wallet has been disconnected successfully.",
              })

              // Force reload after a short delay to ensure state is cleared
              setTimeout(() => {
                window.location.reload()
              }, 100)
            }}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-red-400 hover:text-red-500 hover:bg-red-500/10"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <WalletSelector onSelect={handleConnect} isConnecting={isConnecting} walletDetected={walletDetected} />
        </div>
      )}
    </div>
  )
}

