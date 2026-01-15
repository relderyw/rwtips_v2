"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import type { DataSettings } from "@/components/match-analysis"
import type { StatisticType, TimePeriod } from "@/components/statistics-filters"
import { calculateComparisonMetrics, type ComparisonMetrics } from "@/lib/statistics"

interface ComparisonTableProps {
  homeTeamId: string
  awayTeamId: string
  tournamentId: string
  dataSettings: DataSettings
  statisticType: StatisticType
  timePeriod: TimePeriod
  selectedTournaments: string[]
}

export function ComparisonTable({
  homeTeamId,
  awayTeamId,
  tournamentId,
  dataSettings,
  statisticType,
  timePeriod,
  selectedTournaments,
}: ComparisonTableProps) {
  const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const tournamentIds = selectedTournaments.length > 0 ? selectedTournaments.join(",") : tournamentId

        // Map timePeriod to eventHalf
        const eventHalfMap = {
          firstHalf: "FIRST_HALF",
          secondHalf: "SECOND_HALF",
          fullTime: "ALL",
        }
        const eventHalf = eventHalfMap[timePeriod]

        // For comparison table, always use performance API (not event-statistics)
        // as it contains all statistics in one call
        const [homeResponse, awayResponse] = await Promise.all([
          fetch(
            `/api/team-matches?teamId=${homeTeamId}&tournamentId=${tournamentIds}&limit=${dataSettings.numberOfMatches}&location=all&eventHalf=${eventHalf}&usePerformanceApi=true`,
          ),
          fetch(
            `/api/team-matches?teamId=${awayTeamId}&tournamentId=${tournamentIds}&limit=${dataSettings.numberOfMatches}&location=all&eventHalf=${eventHalf}&usePerformanceApi=true`,
          ),
        ])

        const [homeData, awayData] = await Promise.all([homeResponse.json(), awayResponse.json()])

        const calculatedMetrics = calculateComparisonMetrics(
          homeData.data || [],
          awayData.data || [],
          homeTeamId,
          awayTeamId,
          statisticType,
          timePeriod,
        )

        setMetrics(calculatedMetrics)
      } catch (error) {
        console.error("Error fetching comparison data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [homeTeamId, awayTeamId, tournamentId, dataSettings, statisticType, timePeriod, selectedTournaments])

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">Carregando dados...</div>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">Nenhum dado disponível</div>
      </Card>
    )
  }

  const statRows = [
    { 
      label: "Gols", 
      for: metrics.home.goals,  // FOR = estatísticas DO time mandante
      against: metrics.away.goals,  // AGT = estatísticas DO time visitante
      avg: metrics.average.goals 
    },
    { 
      label: "Escanteios", 
      for: metrics.home.corners, 
      against: metrics.away.corners, 
      avg: metrics.average.corners 
    },
    { 
      label: "Cartões", 
      for: metrics.home.cards, 
      against: metrics.away.cards, 
      avg: metrics.average.cards 
    },
    {
      label: "Chutes no Alvo",
      for: metrics.home.shotsOnTarget,
      against: metrics.away.shotsOnTarget,
      avg: metrics.average.shotsOnTarget,
    },
    {
      label: "Chutes na Área",
      for: metrics.home.shotsInTheBox,
      against: metrics.away.shotsInTheBox,
      avg: metrics.average.shotsInTheBox,
    },
    {
      label: "Chutes Fora da Área",
      for: metrics.home.shotsOutsideTheBox,
      against: metrics.away.shotsOutsideTheBox,
      avg: metrics.average.shotsOutsideTheBox,
    },
    {
      label: "Total de Chutes",
      for: metrics.home.totalShots,
      against: metrics.away.totalShots,
      avg: metrics.average.totalShots,
    },
    {
      label: "Chutes Fora do Alvo",
      for: metrics.home.shotsOffTarget,
      against: metrics.away.shotsOffTarget,
      avg: metrics.average.shotsOffTarget,
    },
    { label: "Faltas", for: metrics.home.fouls, against: metrics.away.fouls, avg: metrics.average.fouls },
    { label: "Pênaltis", for: metrics.home.penalties, against: metrics.away.penalties, avg: metrics.average.penalties },
    {
      label: "Cartões Amarelos",
      for: metrics.home.yellowCards,
      against: metrics.away.yellowCards,
      avg: metrics.average.yellowCards,
    },
    {
      label: "Cartões Vermelhos",
      for: metrics.home.redCards,
      against: metrics.away.redCards,
      avg: metrics.average.redCards,
    },
  ]

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium text-sm">Tipo de Estatística</th>
              <th className="text-center p-4 font-medium text-sm relative group">
                AVG
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] cursor-help opacity-0 group-hover:opacity-100 transition-opacity" title="Média geral entre ambos os times">
                  i
                </div>
              </th>
              <th className="text-center p-4 font-medium text-sm relative group">
                Casa
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] cursor-help opacity-0 group-hover:opacity-100 transition-opacity" title="Estatísticas do time mandante">
                  i
                </div>
              </th>
              <th className="text-center p-4 font-medium text-sm relative group">
                Visitante
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] cursor-help opacity-0 group-hover:opacity-100 transition-opacity" title="Estatísticas do time visitante">
                  i
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {statRows.map((row, index) => (
              <tr key={index} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="p-4 text-sm">{row.label}</td>
                <td className="p-4 text-center text-sm text-muted-foreground">{row.avg.toFixed(2)}</td>
                <td className="p-4 text-center text-sm text-blue-400">{row.for.toFixed(2)}</td>
                <td className="p-4 text-center text-sm text-red-400">{row.against.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
