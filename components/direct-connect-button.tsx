"use client"

import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useBlockchain } from "@/contexts/blockchain-context"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"

export function DirectConnectButton() {
  const { connect } = useBlockchain()
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const handleDirectConnect = async () => {
    // Try to connect directly to window.ethereum
    if (!window.ethereum) {
      toast({
        title: "No wallet detected",
        description: "Please install MetaMask, Rabby, or another compatible wallet.",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)

    try {
      await connect(window.ethereum)
    } catch (err) {
      console.error("Direct connection failed:", err)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Button onClick={handleDirectConnect} disabled={isConnecting} className="mt-2 w-full" variant="secondary">
      <Wallet className="mr-2 h-4 w-4" />
      {isConnecting ? "Connecting..." : "Try Direct Connection"}
    </Button>
  )
}

