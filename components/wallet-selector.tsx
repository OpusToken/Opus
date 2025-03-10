"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Wallet, ExternalLink } from "lucide-react"

interface WalletOption {
  id: string
  name: string
  icon: string
  description: string
  getProvider: () => any
  downloadUrl: string
}

interface WalletSelectorProps {
  onSelect: (provider: any) => void
  isConnecting: boolean
  walletDetected: boolean
}

export function WalletSelector({ onSelect, isConnecting, walletDetected }: WalletSelectorProps) {
  const [open, setOpen] = useState(false)
  const [detectedWallets, setDetectedWallets] = useState<string[]>([])

  // Detect available wallets
  useEffect(() => {
    const detectWallets = () => {
      const detected: string[] = []

      if (window.ethereum?.isMetaMask) detected.push("metamask")
      if ((window as any).rabby) detected.push("rabby")
      if ((window as any).trustwallet) detected.push("trust")
      if ((window as any).internetmoney) detected.push("im")

      setDetectedWallets(detected)
      console.log("Detected wallets:", detected)
    }

    detectWallets()
  }, [])

  const walletOptions: WalletOption[] = [
    {
      id: "metamask",
      name: "MetaMask",
      icon: "/metamask-icon.svg",
      description: "Connect to your MetaMask wallet",
      getProvider: () => (window.ethereum?.isMetaMask ? window.ethereum : null),
      downloadUrl: "https://metamask.io/download/",
    },
    {
      id: "rabby",
      name: "Rabby",
      icon: "/rabby-icon.svg",
      description: "Connect to your Rabby wallet",
      getProvider: () => (window as any).rabby,
      downloadUrl: "https://rabby.io/",
    },
    {
      id: "trust",
      name: "Trust Wallet",
      icon: "/trust-icon.svg",
      description: "Connect to your Trust wallet",
      getProvider: () => (window as any).trustwallet,
      downloadUrl: "https://trustwallet.com/download",
    },
    {
      id: "im",
      name: "Internet Money",
      icon: "/im-icon.svg",
      description: "Connect to your Internet Money wallet",
      getProvider: () => (window as any).internetmoney,
      downloadUrl: "https://internetmoney.com/", // Replace with actual URL
    },
  ]

  const handleSelectWallet = (wallet: WalletOption) => {
    const provider = wallet.getProvider()
    if (provider) {
      onSelect(provider)
      setOpen(false)
    } else {
      // Handle case where provider is not available
      window.open(wallet.downloadUrl, "_blank")
    }
  }

  // Direct connect if only one wallet is detected
  const directConnect = () => {
    if (detectedWallets.length === 1) {
      const wallet = walletOptions.find((w) => w.id === detectedWallets[0])
      if (wallet) {
        const provider = wallet.getProvider()
        if (provider) {
          onSelect(provider)
        }
      }
    } else {
      setOpen(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={isConnecting}
          className="border-neon-green/50 hover:border-neon-green hover:text-neon-green font-bold"
          variant="outline"
          size="sm"
          onClick={directConnect}
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? "Connecting..." : walletDetected ? "Connect Wallet" : "Install Wallet"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{walletDetected ? "Connect your wallet" : "Install a wallet"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {walletOptions.map((wallet) => {
            const isDetected = detectedWallets.includes(wallet.id)

            return (
              <div key={wallet.id} className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className={`flex justify-start items-center gap-3 h-16 px-4 ${isDetected ? "" : "opacity-60"}`}
                  onClick={() => handleSelectWallet(wallet)}
                >
                  <div className="w-8 h-8 relative flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {/* Fallback icon if image fails to load */}
                      <Wallet className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{wallet.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {isDetected ? wallet.description : "Not detected - Click to install"}
                    </span>
                  </div>
                </Button>

                {!isDetected && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs flex items-center justify-center"
                    onClick={() => window.open(wallet.downloadUrl, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Install {wallet.name}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

