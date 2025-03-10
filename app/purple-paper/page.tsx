import { Card } from "@/components/ui/card"

export default function PurplePaperPage() {
  // redirect('/purplepaper') //This redirect is not needed here. It should be in a different file for handling redirects.
  return (
    <div className="container py-10">
      <Card className="bg-background/20 backdrop-blur-md border-neon-green/10 p-8 max-w-4xl mx-auto">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">Opus Token Purple Paper</h1>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neon-green">Introduction</h2>
            <p>[Your introduction content from the Google Drive document goes here]</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neon-green">Vision & Mission</h2>
            <p>[Your vision and mission content from the Google Drive document goes here]</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neon-green">Tokenomics</h2>
            <p>[Your tokenomics content from the Google Drive document goes here]</p>

            <div className="mt-4 bg-background/30 p-4 rounded-md">
              <h3 className="text-xl font-medium mb-2">Token Distribution</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>[Distribution item 1]</li>
                <li>[Distribution item 2]</li>
                <li>[Distribution item 3]</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neon-green">Technology</h2>
            <p>[Your technology content from the Google Drive document goes here]</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neon-green">Roadmap</h2>
            <div className="space-y-4">
              <div className="border-l-2 border-neon-green pl-4 pb-4">
                <h3 className="text-xl font-medium">Phase 1: [Phase Name]</h3>
                <p className="text-muted-foreground">[Phase 1 details]</p>
              </div>

              <div className="border-l-2 border-neon-green pl-4 pb-4">
                <h3 className="text-xl font-medium">Phase 2: [Phase Name]</h3>
                <p className="text-muted-foreground">[Phase 2 details]</p>
              </div>

              <div className="border-l-2 border-neon-green pl-4 pb-4">
                <h3 className="text-xl font-medium">Phase 3: [Phase Name]</h3>
                <p className="text-muted-foreground">[Phase 3 details]</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-neon-green">Team</h2>
            <p>[Your team content from the Google Drive document goes here]</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-neon-green">Conclusion</h2>
            <p>[Your conclusion content from the Google Drive document goes here]</p>
          </section>
        </div>
      </Card>
    </div>
  )
}

