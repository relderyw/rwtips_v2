import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Get today at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfToday = Math.floor(today.getTime() / 1000)
    
    // Get 14 days from today
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + 14)
    futureDate.setHours(23, 59, 59, 999)
    const endOfFuture = Math.floor(futureDate.getTime() / 1000)
    
    console.log('[Pre-Live API] Fetching matches from:', new Date(startOfToday * 1000).toISOString(), 'to:', new Date(endOfFuture * 1000).toISOString())
    
    const response = await fetch(
      `https://www.statshub.com/api/event/by-date?startOfDay=${startOfToday}&endOfDay=${endOfFuture}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      console.error('[Pre-Live API] API responded with status:', response.status)
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log('[Pre-Live API] Total matches received:', data.data?.length || 0)
    
    // Get current timestamp
    const now = Math.floor(Date.now() / 1000)
    
    // Filter only future matches (not started yet)
    const preLiveMatches = data.data?.filter((match: any) => {
      const timeStart = match.events.timeStartTimestamp
      const isFuture = timeStart > now
      const status = match.events.status
      
      // Include if it's in the future OR if status is "notstarted"
      return isFuture || status === "notstarted"
    }) || []
    
    console.log('[Pre-Live API] Pre-live matches (future):', preLiveMatches.length)
    
    return NextResponse.json({ data: preLiveMatches })
  } catch (error) {
    console.error("[Pre-Live API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch pre-live matches" }, { status: 500 })
  }
}
