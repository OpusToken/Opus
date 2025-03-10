"use client"

import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { OPUS_TOKEN_ADDRESS } from "@/lib/contracts"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"

interface AddToWalletProps {
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function AddToWallet({ className, variant = "outline", size = "sm" }: AddToWalletProps) {
  const [isAdding, setIsAdding] = useState(false)
  const { toast } = useToast()

  const addTokenToWallet = async () => {
    if (!window.ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install Rabby, MetaMask or another compatible wallet.",
        variant: "destructive",
      })
      return
    }

    setIsAdding(true)

    try {
      // Use the wallet_watchAsset method to add the token
      const success = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: OPUS_TOKEN_ADDRESS,
            symbol: "OPUS",
            decimals: 18,
            image:
              "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/opuslogo-r4Yhc5UR1DgXnkLtpqO609Mgpup1GP.webp",
          },
        },
      })

      if (success) {
        toast({
          title: "Success!",
          description: "OPUS token has been added to your wallet.",
        })
      } else {
        toast({
          title: "Something went wrong",
          description: "The token may not have been added to your wallet.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding token to wallet:", error)

      // Improved error handling for user rejection
      if (error.code === 4001) {
        toast({
          title: "Request rejected",
          description: "You rejected the request to add the token to your wallet.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Failed to add token",
          description: "There was an error adding the token to your wallet.",
          variant: "destructive",
        })
      }
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Button onClick={addTokenToWallet} disabled={isAdding} variant={variant} size={size} className={className}>
      <PlusCircle className="mr-2 h-4 w-4" />
      {isAdding ? "Adding..." : "Add to Wallet"}
    </Button>
  )
}

