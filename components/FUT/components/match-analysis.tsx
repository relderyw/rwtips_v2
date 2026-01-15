
"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataSettingsPanel } from "@/components/data-settings-panel"
import { TeamComparison } from "@/components/team-comparison"
import { ComparisonTable } from "@/components/comparison-table"
import { PlayerAnalysis } from "@/components/player-analysis"
import {
  StatisticsFilters,
  type StatisticType,
  type TimePeriod,
  type ComparisonType,
  type Tournament,
} from "@/components/statistics-filters"
import { ArrowLeft, Settings } from "lucide-react"

interface MatchAnalysisProps {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  tournamentId: string
  onBack: () => void
}

export interface DataSettings {
  numberOfMatches: number
  includeHome: boolean
  includeAway: boolean
  sameCompetition: boolean
}

export function MatchAnalysis({ matchId, homeTeamId, awayTeamId, tournamentId, onBack }: MatchAnalysisProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [dataSettings, setDataSettings] = useState<DataSettings>({
    numberOfMatches: 10,
    includeHome: true,
    includeAway: true,
    sameCompetition: false,
  })
  const [statisticType, setStatisticType] = useState<StatisticType>("goals")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("fullTime")
  const [comparisonType, setComparisonType] = useState<ComparisonType>("over")
  const [comparisonValue, setComparisonValue] = useState(0.5)
  const [selectedTournaments, setSelectedTournaments] = useState<string[]>([])
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([])

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const [homeResponse, awayResponse] = await Promise.all([
          fetch(`/api/f-team-tournaments?teamId=${homeTeamId}`),
          fetch(`/api/f-team-tournaments?teamId=${awayTeamId}`),
        ])

        const [homeData, awayData] = await Promise.all([homeResponse.json(), awayResponse.json()])

        const tournamentsMap = new Map<string, Tournament>()

        Object.entries(homeData).forEach(([id, tournament]: [string, any]) => {
          tournamentsMap.set(id, {
            id,
            name: tournament.tournamentName,
            seasons: tournament.seasons,
          })
        })

        Object.entries(awayData).forEach(([id, tournament]: [string, any]) => {
          if (!tournamentsMap.has(id)) {
            tournamentsMap.set(id, {
              id,
              name: tournament.tournamentName,
              seasons: tournament.seasons,
            })
          }
        })

        const tournaments = Array.from(tournamentsMap.values())
        setAvailableTournaments(tournaments)
        setSelectedTournaments(tournaments.map((t) => t.id))
      } catch (error) {
        console.error("Error fetching tournaments:", error)
      }
    }

    fetchTournaments()
  }, [homeTeamId, awayTeamId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Partidas
        </Button>

        <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>

      {showSettings && (
        <Card className="p-6">
          <DataSettingsPanel settings={dataSettings} onSettingsChange={setDataSettings} />
        </Card>
      )}

      <StatisticsFilters
        statisticType={statisticType}
        timePeriod={timePeriod}
        comparisonType={comparisonType}
        comparisonValue={comparisonValue}
        selectedTournaments={selectedTournaments}
        availableTournaments={availableTournaments}
        onStatisticTypeChange={setStatisticType}
        onTimePeriodChange={setTimePeriod}
        onComparisonTypeChange={setComparisonType}
        onComparisonValueChange={setComparisonValue}
        onTournamentsChange={setSelectedTournaments}
      />

      <Tabs defaultValue="percentage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="percentage">Análise de Percentual</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo de Métricas</TabsTrigger>
          <TabsTrigger value="players">Análises Players</TabsTrigger>
        </TabsList>

        <TabsContent value="percentage" className="mt-6">
          <TeamComparison
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            tournamentId={tournamentId}
            dataSettings={dataSettings}
            statisticType={statisticType}
            timePeriod={timePeriod}
            comparisonType={comparisonType}
            comparisonValue={comparisonValue}
            selectedTournaments={selectedTournaments}
          />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <ComparisonTable
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            tournamentId={tournamentId}
            dataSettings={dataSettings}
            statisticType={statisticType}
            timePeriod={timePeriod}
            selectedTournaments={selectedTournaments}
          />
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <PlayerAnalysis
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            tournamentId={tournamentId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
