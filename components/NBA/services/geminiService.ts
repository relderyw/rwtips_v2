
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export async function getGameAnalysis(homeTeam: string, awayTeam: string, stats: any) {
  try {
    const prompt = `
      Analyze the NBA game between ${awayTeam} (Away) and ${homeTeam} (Home).
      Using the following season statistics:
      Home: ${JSON.stringify(stats.home)}
      Away: ${JSON.stringify(stats.away)}
      
      Provide a concise 3-paragraph analysis in Portuguese:
      1. Key Tactical Matchup: Who has the advantage in the paint or perimeter?
      2. Statistical X-Factor: Which metric (3P%, Turnovers, etc.) will decide this game?
      3. Final Betting Insight: A professional recommendation for Spread or Total Points.
      
      Keep the tone professional and expert-level.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Falha ao gerar análise de IA. Por favor, verifique as estatísticas manuais abaixo.";
  }
}
