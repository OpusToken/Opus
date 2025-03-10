import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OpusLogo } from "@/components/opus-logo"
import { ExternalLink, BarChart2 } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col gap-16 pb-8">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6">
            <div className="flex flex-col justify-center space-y-4 max-w-3xl mx-auto text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tighter sm:text-5xl xl:text-6xl/none mb-6 text-[hsl(var(--lavender))]">
                  Opus – The AI-Calibrated Cryptocurrency on Pulsechain
                </h1>
                <p className="text-[hsl(var(--light-purple))] md:text-xl opacity-90 font-medium">
                  Did you miss out on two of the top-performing tokens on Pulsechain, namely Finvesta and pTGC (The
                  Grays Currency)? Opus token aims to blend the best of these two tokens along with AI-calibrated
                  parameters to better facilitate what people care most about: price appreciation and generating passive
                  income.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Opus Logo Divider */}
      <div className="flex justify-center items-center">
        <div className="relative">
          <OpusLogo size={160} />
          <div className="absolute inset-0 animate-pulse bg-white/10 rounded-full blur-xl -z-10"></div>
        </div>
      </div>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl/tight">
                7% tax on buys, sells, and transfers, distributed as follows:
              </h2>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl font-bold">
                  <span className="mr-2 text-3xl">🔥</span> 3.5% burned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-medium">
                  Tokens are permanently removed from circulation, increasing scarcity and potential value over time.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl font-bold">
                  <span className="mr-2 text-3xl">💧</span> 1% to liquidity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-medium">
                  Enhances trading stability and depth by automatically increasing the liquidity pool.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl font-bold">
                  <span className="mr-2 text-3xl">💰</span> 1.25% holder and staker reflection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-medium">
                  Rewards distributed to token holders and stakers, providing passive income from every transaction.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl font-bold">
                  <span className="mr-2 text-3xl">🏦</span> 1.25% extra reflection for staking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-medium">
                  Additional rewards for users who stake their tokens.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tier System */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold tracking-tighter md:text-4xl/tight mb-4">
                Locking Tiers and Rewards
              </h2>
              <p className="text-lg text-muted-foreground font-medium max-w-3xl mx-auto">
                If you lock your tokens for a minimum of 90 days, you earn even more rewards. The tier system consists
                of five tiers and are outlined below. If you lock your tokens for 1–2 years, you keep 60% of your
                rewards, and 40% are sent to the burn address, removing it from circulation and reducing supply.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Tier 5 - Shortest lock period */}
              <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-2xl font-bold">
                    <span>Tier 5</span>
                    <span className="text-neon-green">90 days-6 months</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Reward</span>
                    <span className="text-lg font-bold text-neon-green">40%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Burned</span>
                    <span className="flex items-center gap-1">
                      <span className="text-lg font-bold text-neon-green">60%</span>
                      <span className="text-xl">🔥</span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Tier 4 */}
              <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-2xl font-bold">
                    <span>Tier 4</span>
                    <span className="text-neon-green">6-12 months</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Reward</span>
                    <span className="text-lg font-bold text-neon-green">50%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Burned</span>
                    <span className="flex items-center gap-1">
                      <span className="text-lg font-bold text-neon-green">50%</span>
                      <span className="text-xl">🔥</span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Tier 3 */}
              <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-2xl font-bold">
                    <span>Tier 3</span>
                    <span className="text-neon-green">1-2 years</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Reward</span>
                    <span className="text-lg font-bold text-neon-green">60%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Burned</span>
                    <span className="flex items-center gap-1">
                      <span className="text-lg font-bold text-neon-green">40%</span>
                      <span className="text-xl">🔥</span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Tier 2 */}
              <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-2xl font-bold">
                    <span>Tier 2</span>
                    <span className="text-neon-green">2-3 years</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Reward</span>
                    <span className="text-lg font-bold text-neon-green">80%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Burned</span>
                    <span className="flex items-center gap-1">
                      <span className="text-lg font-bold text-neon-green">20%</span>
                      <span className="text-xl">🔥</span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Tier 1 - Longest lock period */}
              <Card className="bg-background/20 backdrop-blur-md border-neon-green/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-2xl font-bold">
                    <span>Tier 1</span>
                    <span className="text-neon-green">3+ years</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Reward</span>
                    <span className="text-lg font-bold text-neon-green">100%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Burned</span>
                    <span className="flex items-center gap-1">
                      <span className="text-lg font-bold text-neon-green">0%</span>
                      <span className="text-xl">🔥</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Contract Links */}
          <div className="mt-16 flex flex-wrap gap-4 justify-center">
            <Button size="md" asChild className="bg-neon-green hover:bg-neon-green/90 text-black font-bold">
              <Link
                href="https://scan.pulsechain.com/token/0x64aa120986030627C3E1419B09ce604e21B9B0FE"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Main Contract
              </Link>
            </Button>
            <Button size="md" asChild className="bg-neon-green hover:bg-neon-green/90 text-black font-bold">
              <Link
                href={`https://scan.pulsechain.com/address/0x7E36b5C2B8D308C651F368DAf2053612E52D1dAe`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Staking Contract
              </Link>
            </Button>
            <Button size="md" asChild className="bg-neon-green hover:bg-neon-green/90 text-black font-bold">
              <Link
                href="https://www.dextools.io/app/en/pulse/pair-explorer/0x816374D925F4aB5bE7239c85CcA18561b7367F87"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                Dextools Chart
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

