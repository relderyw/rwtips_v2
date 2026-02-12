import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get current timestamp and future range (next 7 days)
    const now = Math.floor(Date.now() / 1000)
    const futureRange = now + (7 * 24 * 60 * 60) // 7 days from now
    
    const response = await fetch(
      `https://www.statshub.com/api/event/by-date?startOfDay=${now}&endOfDay=${futureRange}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    // Filter only matches that haven't started yet
    const preLiveMatches = data.data?.filter((match: any) => 
      match.events.status === "notstarted" || 
      match.events.timeStartTimestamp > now
    ) || []
    
    return NextResponse.json({ data: preLiveMatches })
  } catch (error) {
    console.error("Error fetching pre-live matches:", error)
    return NextResponse.json({ error: "Failed to fetch pre-live matches" }, { status: 500 })
  }
}
