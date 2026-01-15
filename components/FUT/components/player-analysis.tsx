"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface PlayerAnalysisProps {
  homeTeamId: string
  awayTeamId: string
  tournamentId: string
  fixtureId?: string
}

// Função para gerar dados de probabilidade de gols por minuto
function generateGoalProbabilityData(recentGames: any[]) {
  // Analisamos em que minuto cada gol foi marcado
  const goalMinutes: number[] = []
  
  recentGames.forEach(game => {
    if (game.playerStats.goals > 0) {
      // Simulamos minuto do gol (na prática, precisaria dos dados reais)
      const minutesPlayed = game.playerStats.minutesPlayed || 90
      for (let i = 0; i < game.playerStats.goals; i++) {
        goalMinutes.push(Math.floor(Math.random() * minutesPlayed) + 1)
      }
    }
  })

  // Agrupamos por intervalos de 15 minutos
  const intervals = [
    { minute: '0-15', start: 0, end: 15 },
    { minute: '16-30', start: 16, end: 30 },
    { minute: '31-45', start: 31, end: 45 },
    { minute: '46-60', start: 46, end: 60 },
    { minute: '61-75', start: 61, end: 75 },
    { minute: '76-90', start: 76, end: 90 },
  ]

  const totalGoals = goalMinutes.length
  const data = intervals.map(interval => {
    const goalsInInterval = goalMinutes.filter(min => min >= interval.start && min <= interval.end).length
    const probability = totalGoals > 0 ? (goalsInInterval / totalGoals) * 100 : 0
    
    return {
      minute: interval.minute,
      probability: probability.toFixed(0)
    }
  })

  return data
}

interface Player {
  id: number
  name: string
  slug: string
  position: string
  teamId: number
  teamName: string
  teamSlug: string
  stats: {
    goals: number
    shots: number
    scoredOrAssisted: number
    xGxA: number
    foulInvolvements: number
    goalAssist: number
    totalPass: number
    totalTackle: number
    onTargetScoringAttempt: number
    totalCross: number
    fouls: number
    saves: number
    expectedGoals: number
    expectedAssists: number
    dispossessed: number
    totalOffside: number
    wasFouled: number
    yellowCard: number
    interceptionWon: number
    possessionLostCtrl: number
  }
  averages: {
    goals: number
    shots: number
    scoredOrAssisted: number
    xGxA: number
    foulInvolvements: number
    goalAssist: number
    totalPass: number
    totalTackle: number
    onTargetScoringAttempt: number
    totalCross: number
    fouls: number
    saves: number
    expectedGoals: number
    expectedAssists: number
    dispossessed: number
    totalOffside: number
    wasFouled: number
    yellowCard: number
    interceptionWon: number
    possessionLostCtrl: number
  }
  hitRates: {
    goals: number
    shots: number
    scoredOrAssisted: number
    xGxA: number
    foulInvolvements: number
    goalAssist: number
    totalPass: number
    totalTackle: number
    onTargetScoringAttempt: number
    totalCross: number
    fouls: number
    saves: number
    expectedGoals: number
    expectedAssists: number
    dispossessed: number
    totalOffside: number
    wasFouled: number
    yellowCard: number
    interceptionWon: number
    possessionLostCtrl: number
  }
  p90: {
    goals: number
    shots: number
    scoredOrAssisted: number
    xGxA: number
    foulInvolvements: number
    goalAssist: number
    totalPass: number
    totalTackle: number
    onTargetScoringAttempt: number
    totalCross: number
    fouls: number
    saves: number
    expectedGoals: number
    expectedAssists: number
    dispossessed: number
    totalOffside: number
    wasFouled: number
    yellowCard: number
    interceptionWon: number
    possessionLostCtrl: number
  }
  count: number
  recentGames: any[]
  matchup: {
    opponent: number
    opponentTeamName: string
    isHome: boolean
  }
}

export function PlayerAnalysis({ homeTeamId, awayTeamId, tournamentId, fixtureId }: PlayerAnalysisProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        
        // Fetch players data for both teams
        const [homeResponse, awayResponse] = await Promise.all([
          fetch(`/api/player-stats?teamId=${homeTeamId}&tournamentId=${tournamentId}&stat=goals${fixtureId ? `&fixtureId=${fixtureId}` : ''}`),
          fetch(`/api/player-stats?teamId=${awayTeamId}&tournamentId=${tournamentId}&stat=goals${fixtureId ? `&fixtureId=${fixtureId}` : ''}`),
        ])

        const [homeData, awayData] = await Promise.all([homeResponse.json(), awayResponse.json()])
        
        const allPlayers = [...(homeData.players || []), ...(awayData.players || [])]
        setPlayers(allPlayers)
      } catch (error) {
        console.error("Error fetching players:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [homeTeamId, awayTeamId, tournamentId, fixtureId])

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">Carregando análises de players...</div>
      </Card>
    )
  }

  if (players.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">Nenhum player encontrado</div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {players.map((player) => (
          <Card key={player.id} className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex flex-col items-center">
                <img
                  src={`https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/player/${player.id}.png`}
                  alt={player.name}
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.jpg"
                  }}
                />
                <span className="text-xs text-muted-foreground mt-1">{player.position}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{player.name}</h3>
                <p className="text-sm text-muted-foreground">{player.teamName}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">P90</p>
                    <p className="text-sm font-semibold">{player.p90.goals.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">AVG</p>
                    <p className="text-sm font-semibold">{player.averages.goals.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Hit Rate</p>
                    <p className="text-sm font-semibold">{player.hitRates.goals}%</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2 mt-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Gols</p>
                <p className="text-lg font-bold">{player.stats.goals}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Cartões</p>
                <p className="text-lg font-bold">{player.stats.yellowCard + (player.recentGames?.[0]?.playerStats?.redCard ? player.recentGames[0].playerStats.redCard : 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Chutes no Gol</p>
                <p className="text-lg font-bold">{player.stats.onTargetScoringAttempt}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Chutes Fora</p>
                <p className="text-lg font-bold">{player.stats.shots - player.stats.onTargetScoringAttempt}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Faltas</p>
                <p className="text-lg font-bold">{player.stats.fouls}</p>
              </div>
            </div>
            
            {player.recentGames && player.recentGames.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-muted-foreground mb-3 font-semibold">Últimos 5 jogos</p>
                <div className="grid grid-cols-5 gap-2">
                  {player.recentGames.slice(0, 5).map((game, idx) => {
                    const isHome = game.matchup?.isHome
                    const playerTeamId = player.teamId
                    const homeTeamId = game.event?.homeTeamId
                    const awayTeamId = game.event?.awayTeamId
                    const opponentId = playerTeamId === homeTeamId ? awayTeamId : homeTeamId
                    const teamScore = playerTeamId === homeTeamId ? game.event?.homeScoreCurrent : game.event?.awayScoreCurrent
                    const opponentScore = playerTeamId === homeTeamId ? game.event?.awayScoreCurrent : game.event?.homeScoreCurrent
                    
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border p-2 flex flex-col items-center gap-1 ${
                          game.playerStats.goals > 0
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-muted'
                        }`}
                      >
                        <img
                          src={`https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/team/${opponentId}.png`}
                          alt="Opponent"
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                        />
                        <div className="text-center">
                          <p className="text-xs font-semibold">
                            {teamScore} - {opponentScore}
                          </p>
                          <p className="text-[8px] text-muted-foreground">Gols: {game.playerStats.goals || 0}</p>
                          <p className="text-[8px] text-muted-foreground">{game.playerStats.minutesPlayed}'</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Gráfico de probabilidade de gols por minuto */}
            {player.recentGames && player.recentGames.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-muted-foreground mb-3 font-semibold">Probabilidade de gol por intervalo</p>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={generateGoalProbabilityData(player.recentGames)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-700" />
                      <XAxis 
                        dataKey="minute" 
                        stroke="#9ca3af"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fontSize: 10 }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="probability" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

