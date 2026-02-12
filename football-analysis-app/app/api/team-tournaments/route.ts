export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get("teamId")

  if (!teamId) {
    return Response.json({ error: "Team ID is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://www.statshub.com/api/team/${teamId}/tournaments-and-seasons`)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error("Error fetching tournaments:", error)
    return Response.json({ error: "Failed to fetch tournaments" }, { status: 500 })
  }
}
