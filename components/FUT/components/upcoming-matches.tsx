
"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Event {
  id: number
  timeStartTimestamp: number
}

interface Team {
  id: number
  name: string
}

interface Tournament {
  id: number
  name: string
}

interface Category {
  id: number
  name: string
}

interface UniqueTournament {
  id: number
}

interface Match {
  events: Event
  homeTeam: Team
  awayTeam: Team
  tournaments: Tournament
  categories: Category
  unique_tournaments: UniqueTournament | null
}

interface UpcomingMatchesProps {
  onSelectMatch: (matchData: {
    matchId: string
    homeTeamId: string
    awayTeamId: string
    tournamentId: string
  }) => void
}

export function UpcomingMatches({ onSelectMatch }: UpcomingMatchesProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLeagueName, setSelectedLeagueName] = useState("all")

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const now = new Date()
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime() / 1000
        const endOfDay = new Date(now.setHours(23, 59, 59, 999)).getTime() / 1000

        const response = await fetch(`${window.location.protocol}//${window.location.hostname}:8080/api/f-matches?startOfDay=${startOfDay}&endOfDay=${endOfDay}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setMatches(data.events || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [])

  const filteredMatches = matches.filter((match) => {
    const matchesSearch =
      match.homeTeam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.awayTeam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.tournaments.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesLeague = selectedLeagueName === "all" || match.tournaments.name === selectedLeagueName

    return matchesSearch && matchesLeague
  })

  // Group matches by tournament name
  const groupedMatches = filteredMatches.reduce((acc: Record<string, Match[]>, match) => {
    const tournamentName = match.tournaments.name
    if (!acc[tournamentName]) {
      acc[tournamentName] = []
    }
    acc[tournamentName].push(match)
    return acc
  }, {})

  // Get all unique league names for the filter
  const uniqueLeagues = Array.from(new Set(matches.map((match) => match.tournaments.name))).sort()

  const handleAnalyzeClick = (match: Match) => {
    onSelectMatch({
      matchId: match.events.id.toString(),
      homeTeamId: match.homeTeam.id.toString(),
      awayTeamId: match.awayTeam.id.toString(),
      tournamentId: match.tournaments.id.toString()
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Error loading matches: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search teams or leagues..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:max-w-xs"
        />
        <Select value={selectedLeagueName} onValueChange={setSelectedLeagueName}>
          <SelectTrigger className="md:max-w-xs">
            <SelectValue placeholder="Filter by league" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leagues</SelectItem>
            {uniqueLeagues.map((league) => (
              <SelectItem key={league} value={league}>
                {league}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-8">
        {Object.entries(groupedMatches).map(([tournamentName, leagueMatches]: [string, Match[]]) => (
          <div key={tournamentName} className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <h2 className="text-lg font-bold">{tournamentName}</h2>
              <span className="text-sm text-muted-foreground">({leagueMatches.length} matches)</span>
            </div>

            <div className="grid gap-4">
              {leagueMatches.map((match) => (
                <Card
                  key={match.events.id}
                  className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleAnalyzeClick(match)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={`https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/unique-tournament/${match.unique_tournaments?.id || match.tournaments.id}.png`}
                          alt={match.tournaments.name}
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/medieval-jousting-tournament.png"
                          }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {match.tournaments.name} • {match.categories.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <img
                            src={`https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/team/${match.homeTeam.id}.png`}
                            alt={match.homeTeam.name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/diverse-professional-team.png"
                            }}
                          />
                          <span className="font-semibold text-foreground">{match.homeTeam.name}</span>
                        </div>

                        <div className="flex items-center gap-3 px-4">
                          <span className="text-sm text-muted-foreground">
                            {new Date(match.events.timeStartTimestamp * 1000).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span className="font-semibold text-foreground">{match.awayTeam.name}</span>
                          <img
                            src={`https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/team/${match.awayTeam.id}.png`}
                            alt={match.awayTeam.name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/diverse-professional-team.png"
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="ml-4" onClick={(e) => { e.stopPropagation(); handleAnalyzeClick(match); }}>
                      Analyze
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
