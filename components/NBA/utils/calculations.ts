
import { SeasonStats, Projections } from '../types';

export function calculateProjections(home: SeasonStats, away: SeasonStats): Projections {
  const homePts = parseFloat(home.pointsForPerGame) || 113.5;
  const awayPts = parseFloat(away.pointsForPerGame) || 113.5;
  const homeDef = parseFloat(home.pointsAgainstPerGame) || 113.5;
  const awayDef = parseFloat(away.pointsAgainstPerGame) || 113.5;

  // Simple weighted projection: (Avg Pts + Opponent Avg Pts Against) / 2
  const projectedHome = (homePts + awayDef) / 2 + 1.5; // +1.5 for basic home advantage
  const projectedAway = (awayPts + homeDef) / 2;
  
  const total = Math.round(projectedHome + projectedAway);
  const spreadValue = projectedHome - projectedAway;
  const spread = spreadValue >= 0 ? `-${spreadValue.toFixed(1)}` : `+${Math.abs(spreadValue).toFixed(1)}`;

  // Win probability using a simplified logit-like approach for NBA
  const prob = 1 / (1 + Math.pow(10, (-spreadValue / 12)));
  
  return {
    total,
    spread,
    homeProb: Math.round(prob * 100),
    awayProb: Math.round((1 - prob) * 100),
    homePts: projectedHome.toFixed(1),
    awayPts: projectedAway.toFixed(1),
    confidence: Math.abs(spreadValue) > 5 ? 'High' : 'Medium'
  };
}

export function formatTeamName(fullName: string) {
  const parts = fullName.split(' ');
  const nickname = parts.pop();
  return { city: parts.join(' '), nickname };
}

export function getTeamLogo(seo: string) {
  return `https://tsnimages.tsn.ca/ImageProvider/TeamLogo?seoId=${seo}&width=80&height=80`;
}
