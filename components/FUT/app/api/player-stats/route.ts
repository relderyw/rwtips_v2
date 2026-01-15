import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")
    const tournamentId = searchParams.get("tournamentId")
    const stat = searchParams.get("stat") || "goals"
    const lastGames = searchParams.get("lastGames") || "5"
    const fixtureId = searchParams.get("fixtureId")

    if (!teamId || !tournamentId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get current date range (today)
    const now = new Date()
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime() / 1000
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).getTime() / 1000

    // Build the API URL
    const url = new URL(`https://www.statshub.com/api/props/hunter`)
    url.searchParams.set("stat", stat)
    url.searchParams.set("startOfDay", startOfDay.toString())
    url.searchParams.set("endOfDay", endOfDay.toString())
    url.searchParams.set("tournaments", tournamentId)
    url.searchParams.set("lastGames", lastGames)
    url.searchParams.set("positions", "D,M,F")
    url.searchParams.set("minMinutesPlayed", "0")
    url.searchParams.set("venueFilter", "both")
    url.searchParams.set("selectedLeaguesOnly", "false")
    url.searchParams.set("startedMatch", "false")
    url.searchParams.set("hitRateThreshold", "30")
    url.searchParams.set("statThreshold", "1")
    url.searchParams.set("minGamesPlayed", "0")
    url.searchParams.set("averageThreshold", "0.4")
    url.searchParams.set("averageComparison", "above")
    url.searchParams.set("showTrend", "false")
    
    if (fixtureId) {
      url.searchParams.set("fixtureId", fixtureId)
    }

    console.log("[v0] Fetching player stats from:", url.toString())

    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("[v0] API error response:", errorBody)
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    // Filter players by teamId
    if (data.players) {
      data.players = data.players.filter((player: any) => player.teamId === Number.parseInt(teamId))
    }

    console.log("[v0] Successfully fetched player stats")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error fetching player stats:", error)
    return NextResponse.json({ error: "Failed to fetch player stats" }, { status: 500 })
  }
}

