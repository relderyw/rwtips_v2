import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")
    const tournamentId = searchParams.get("tournamentId")
    const limit = searchParams.get("limit") || "20"
    const location = searchParams.get("location") || "all"
    const eventHalf = searchParams.get("eventHalf") || "ALL"
    const statisticType = searchParams.get("statisticType") || "goals"
    const usePerformanceApi = searchParams.get("usePerformanceApi") === "true"

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId parameter" }, { status: 400 })
    }

    let url: URL

    if (usePerformanceApi) {
      // Use old /performance endpoint for comparison table (has all stats)
      // Convert eventHalf to performance API format
      const eventHalfMapPerformance: Record<string, string> = {
        FIRST_HALF: "1ST",
        SECOND_HALF: "2ND",
        ALL: "ALL"
      }
      const apiEventHalfPerformance = eventHalfMapPerformance[eventHalf] || "ALL"
      
      url = new URL(`https://www.statshub.com/api/team/${teamId}/performance`)
      if (tournamentId) url.searchParams.set("tournamentId", tournamentId)
      url.searchParams.set("limit", limit)
      url.searchParams.set("location", location)
      url.searchParams.set("eventHalf", apiEventHalfPerformance)
    } else {
      // Use new /event-statistics endpoint for filtered stats (goals/corners/cards by time)
      const eventHalfMap: Record<string, string> = {
        FIRST_HALF: "1ST",
        SECOND_HALF: "2ND",
        ALL: "ALL"
      }
      const apiEventHalf = eventHalfMap[eventHalf] || "ALL"

      const statisticKeyMap: Record<string, string> = {
        goals: "goals",
        corners: "cornerKicks",
        cards: "cards"
      }
      const statisticKey = statisticKeyMap[statisticType] || "goals"

      url = new URL(`https://www.statshub.com/api/team/${teamId}/event-statistics`)
      url.searchParams.set("eventType", "all")
      url.searchParams.set("statisticKey", statisticKey)
      url.searchParams.set("eventHalf", apiEventHalf)
      url.searchParams.set("limit", limit)
      
      if (tournamentId) {
        url.searchParams.set("tournamentIds", tournamentId)
      }
    }

    console.log("[v0] Fetching team matches from:", url.toString())

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
    console.log("[v0] Successfully fetched team matches")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error fetching team matches:", error)
    return NextResponse.json({ error: "Failed to fetch team matches" }, { status: 500 })
  }
}
