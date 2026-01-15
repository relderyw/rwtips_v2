"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Minus } from "lucide-react"

export type StatisticType = "goals" | "corners" | "cards"
export type TimePeriod = "firstHalf" | "secondHalf" | "fullTime"
export type ComparisonType = "over" | "under"

export interface Tournament {
  id: string
  name: string
  seasons: Array<{ seasonId: number; seasonName: string }>
}

interface StatisticsFiltersProps {
  statisticType: StatisticType
  timePeriod: TimePeriod
  comparisonType: ComparisonType
  comparisonValue: number
  selectedTournaments: string[]
  availableTournaments: Tournament[]
  onStatisticTypeChange: (type: StatisticType) => void
  onTimePeriodChange: (period: TimePeriod) => void
  onComparisonTypeChange: (type: ComparisonType) => void
  onComparisonValueChange: (value: number) => void
  onTournamentsChange: (tournaments: string[]) => void
}

export function StatisticsFilters({
  statisticType,
  timePeriod,
  comparisonType,
  comparisonValue,
  selectedTournaments,
  availableTournaments,
  onStatisticTypeChange,
  onTimePeriodChange,
  onComparisonTypeChange,
  onComparisonValueChange,
  onTournamentsChange,
}: StatisticsFiltersProps) {
  const handleTournamentToggle = (tournamentId: string) => {
    if (selectedTournaments.includes(tournamentId)) {
      onTournamentsChange(selectedTournaments.filter((id) => id !== tournamentId))
    } else {
      onTournamentsChange([...selectedTournaments, tournamentId])
    }
  }

  const incrementValue = () => {
    onComparisonValueChange(comparisonValue + 0.5)
  }

  const decrementValue = () => {
    if (comparisonValue > 0.5) {
      onComparisonValueChange(comparisonValue - 0.5)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Statistic Type Filter */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Tipo de Estatística</h3>
          <div className="flex gap-2">
            <Button
              variant={statisticType === "goals" ? "default" : "outline"}
              onClick={() => onStatisticTypeChange("goals")}
              className="flex-1"
            >
              Gols
            </Button>
            <Button
              variant={statisticType === "corners" ? "default" : "outline"}
              onClick={() => onStatisticTypeChange("corners")}
              className="flex-1"
            >
              Escanteios
            </Button>
            <Button
              variant={statisticType === "cards" ? "default" : "outline"}
              onClick={() => onStatisticTypeChange("cards")}
              className="flex-1"
            >
              Cartões
            </Button>
          </div>
        </div>

        {/* Time Period Filter */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Período do Jogo</h3>
          <div className="flex gap-2">
            <Button
              variant={timePeriod === "firstHalf" ? "default" : "outline"}
              onClick={() => onTimePeriodChange("firstHalf")}
              className="flex-1"
            >
              1º Tempo
            </Button>
            <Button
              variant={timePeriod === "secondHalf" ? "default" : "outline"}
              onClick={() => onTimePeriodChange("secondHalf")}
              className="flex-1"
            >
              2º Tempo
            </Button>
            <Button
              variant={timePeriod === "fullTime" ? "default" : "outline"}
              onClick={() => onTimePeriodChange("fullTime")}
              className="flex-1"
            >
              Jogo Completo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-3 block">Comparação</Label>
            <Select value={comparisonType} onValueChange={(value) => onComparisonTypeChange(value as ComparisonType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="over">Over</SelectItem>
                <SelectItem value="under">Under</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-3 block">Valor</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={decrementValue} disabled={comparisonValue <= 0.5}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={comparisonValue}
                onChange={(e) => onComparisonValueChange(Number.parseFloat(e.target.value) || 0.5)}
                step="0.5"
                min="0.5"
                className="text-center"
              />
              <Button variant="outline" size="icon" onClick={incrementValue}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {availableTournaments.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Torneios</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableTournaments.map((tournament) => (
                <div key={tournament.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={tournament.id}
                    checked={selectedTournaments.includes(tournament.id)}
                    onCheckedChange={() => handleTournamentToggle(tournament.id)}
                  />
                  <label
                    htmlFor={tournament.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {tournament.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
