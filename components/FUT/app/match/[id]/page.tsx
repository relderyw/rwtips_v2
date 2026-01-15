import { MatchAnalysis } from "@/components/match-analysis"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ homeTeamId?: string; awayTeamId?: string; tournamentId?: string }>
}

export default async function MatchPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { homeTeamId, awayTeamId, tournamentId } = await searchParams

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <Link href="/Visualization.html">
            <Button variant="outline">← Voltar</Button>
          </Link>
        </div>
        <MatchAnalysis
          matchId={id}
          homeTeamId={homeTeamId || ""}
          awayTeamId={awayTeamId || ""}
          tournamentId={tournamentId || ""}
        />
      </div>
    </main>
  )
}
