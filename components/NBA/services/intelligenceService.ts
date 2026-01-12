
import { GameEvent, GameIntelligence } from '../types';
import { nbaDataService } from './nbaDataService';

class IntelligenceService {
  /**
   * Analyzes a game and generates intelligence data
   */
  async analyzeGame(game: GameEvent): Promise<GameIntelligence> {
    try {
      // Fetch recent games for both teams
      const [awayRecentGames, homeRecentGames] = await Promise.all([
        nbaDataService.getTeamResults(game.top.seoIdentifier),
        nbaDataService.getTeamResults(game.bottom.seoIdentifier),
      ]);

      // Fetch season stats for pace analysis
      const [eventStats, seasonStats] = await Promise.all([
        nbaDataService.getEventStats(game.eventId).catch(() => null),
        nbaDataService.getSeasonStats(game.eventId).catch(() => null),
      ]);

      // Calculate components
      const awayTrend = this.calculateTeamOverUnderTrend(awayRecentGames);
      const homeTrend = this.calculateTeamOverUnderTrend(homeRecentGames);
      const paceScore = this.calculatePaceScore(seasonStats);
      const playerTrends = await this.analyzePlayerTrends(game.eventId);

      // Calculate intelligence score (0-100)
      const intelligenceScore = this.generateIntelligenceScore({
        awayTrend,
        homeTrend,
        paceScore,
        playerTrends,
      });

      // Determine Over/Under probability
      const overUnderProbability = this.calculateOverUnderProbability({
        awayTrend,
        homeTrend,
        paceScore,
      });

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        overUnderProbability,
        intelligenceScore
      );

      // Determine confidence level
      const confidence = this.determineConfidence(intelligenceScore);

      // Generate reasons
      const reasons = this.generateReasons({
        awayTrend,
        homeTrend,
        paceScore,
        playerTrends,
        recommendation,
      });

      // Calculate expected volume
      const volumeIndicator = Math.round(
        (awayTrend.avgTotal + homeTrend.avgTotal) / 2
      );

      return {
        eventId: game.eventId,
        intelligenceScore,
        overUnderProbability,
        confidence,
        trends: {
          recentOverUnder: `${awayTrend.overCount + homeTrend.overCount}/${
            awayTrend.overCount + awayTrend.underCount + homeTrend.overCount + homeTrend.underCount
          } Over`,
          teamPace: this.getPaceCategory(paceScore),
          playerHotStreak: playerTrends.hasHotStreak,
          volumeIndicator,
        },
        reasons,
        recommendation,
        detailedAnalysis: {
          awayTeamTrend: awayTrend,
          homeTeamTrend: homeTrend,
          paceScore,
        },
      };
    } catch (error) {
      console.error('Error analyzing game:', error);
      // Return default intelligence data
      return this.getDefaultIntelligence(game.eventId);
    }
  }

  /**
   * Calculates Over/Under trend for a team based on recent games
   */
  private calculateTeamOverUnderTrend(recentGames: GameEvent[]) {
    if (recentGames.length === 0) {
      return { overCount: 0, underCount: 0, avgTotal: 220 };
    }

    let overCount = 0;
    let underCount = 0;
    let totalPoints = 0;

    // Typical NBA total line is around 220-230
    const typicalTotal = 225;

    recentGames.forEach((game) => {
      const gameTotal = (game.top.score || 0) + (game.bottom.score || 0);
      totalPoints += gameTotal;

      if (gameTotal > typicalTotal) {
        overCount++;
      } else {
        underCount++;
      }
    });

    const avgTotal = totalPoints / recentGames.length;

    return { overCount, underCount, avgTotal };
  }

  /**
   * Calculates pace score based on season stats
   */
  private calculatePaceScore(seasonStats: any): number {
    if (!seasonStats) return 50; // Default medium pace

    try {
      // Extract pace-related metrics
      const homeStats = seasonStats.home || {};
      const awayStats = seasonStats.away || {};

      // Points per game is a good indicator of pace
      const homePPG = parseFloat(homeStats.pointsForPerGame || '110');
      const awayPPG = parseFloat(awayStats.pointsForPerGame || '110');

      // Average pace score (higher = faster)
      const avgPPG = (homePPG + awayPPG) / 2;

      // Normalize to 0-100 scale (assuming 100-120 PPG range)
      const paceScore = Math.min(100, Math.max(0, ((avgPPG - 100) / 20) * 100));

      return paceScore;
    } catch (error) {
      return 50;
    }
  }

  /**
   * Analyzes player trends for hot/cold streaks
   */
  private async analyzePlayerTrends(eventId: string): Promise<{
    hasHotStreak: boolean;
    avgPerformance: number;
  }> {
    try {
      const playerStats = await nbaDataService.getPlayerStats(eventId);

      if (!playerStats || !playerStats.home || !playerStats.away) {
        return { hasHotStreak: false, avgPerformance: 50 };
      }

      // Analyze top players from both teams
      const allPlayers = [
        ...(playerStats.home.slice(0, 3) || []),
        ...(playerStats.away.slice(0, 3) || []),
      ];

      let hotStreakCount = 0;
      let totalPerformance = 0;

      allPlayers.forEach((playerEntry: any) => {
        const stats = playerEntry.stats || {};
        const ppg = parseFloat(stats.pointsPerGame || '0');

        totalPerformance += ppg;

        // Consider a player "hot" if scoring 20+ PPG
        if (ppg >= 20) {
          hotStreakCount++;
        }
      });

      const hasHotStreak = hotStreakCount >= 2; // At least 2 hot players
      const avgPerformance = allPlayers.length > 0 ? totalPerformance / allPlayers.length : 50;

      return { hasHotStreak, avgPerformance };
    } catch (error) {
      return { hasHotStreak: false, avgPerformance: 50 };
    }
  }

  /**
   * Generates the final intelligence score (0-100)
   */
  private generateIntelligenceScore(data: {
    awayTrend: { overCount: number; underCount: number; avgTotal: number };
    homeTrend: { overCount: number; underCount: number; avgTotal: number };
    paceScore: number;
    playerTrends: { hasHotStreak: boolean; avgPerformance: number };
  }): number {
    // Weight distribution:
    // 40% - Recent Over/Under trend
    // 30% - Player performance
    // 20% - Pace
    // 10% - Volume consistency

    const { awayTrend, homeTrend, paceScore, playerTrends } = data;

    // 1. Over/Under trend score (40%)
    const totalGames = awayTrend.overCount + awayTrend.underCount + 
                       homeTrend.overCount + homeTrend.underCount;
    const totalOvers = awayTrend.overCount + homeTrend.overCount;
    const overTrendScore = totalGames > 0 ? (totalOvers / totalGames) * 100 : 50;

    // 2. Player performance score (30%)
    const playerScore = playerTrends.hasHotStreak ? 80 : playerTrends.avgPerformance * 3;

    // 3. Pace score (20%) - already 0-100
    const normalizedPaceScore = paceScore;

    // 4. Volume consistency (10%)
    const avgVolume = (awayTrend.avgTotal + homeTrend.avgTotal) / 2;
    const volumeScore = Math.min(100, (avgVolume / 240) * 100); // 240+ is high volume

    // Calculate weighted score
    const intelligenceScore = 
      overTrendScore * 0.4 +
      playerScore * 0.3 +
      normalizedPaceScore * 0.2 +
      volumeScore * 0.1;

    return Math.round(Math.min(100, Math.max(0, intelligenceScore)));
  }

  /**
   * Calculates the probability of the game going Over
   */
  private calculateOverUnderProbability(data: {
    awayTrend: { overCount: number; underCount: number };
    homeTrend: { overCount: number; underCount: number };
    paceScore: number;
  }): number {
    const { awayTrend, homeTrend, paceScore } = data;

    const totalGames = awayTrend.overCount + awayTrend.underCount + 
                       homeTrend.overCount + homeTrend.underCount;
    const totalOvers = awayTrend.overCount + homeTrend.overCount;

    if (totalGames === 0) return 50;

    // Base probability from recent games
    let probability = (totalOvers / totalGames) * 100;

    // Adjust based on pace (fast pace increases Over probability)
    const paceAdjustment = (paceScore - 50) * 0.2; // Max ±10%
    probability += paceAdjustment;

    return Math.round(Math.min(100, Math.max(0, probability)));
  }

  /**
   * Generates recommendation based on analysis
   */
  private generateRecommendation(
    overUnderProbability: number,
    intelligenceScore: number
  ): 'OVER' | 'UNDER' | 'SKIP' {
    // Only recommend if intelligence score is decent (>60)
    if (intelligenceScore < 60) return 'SKIP';

    if (overUnderProbability >= 65) return 'OVER';
    if (overUnderProbability <= 35) return 'UNDER';
    
    return 'SKIP';
  }

  /**
   * Determines confidence level
   */
  private determineConfidence(intelligenceScore: number): 'Low' | 'Medium' | 'High' {
    if (intelligenceScore >= 75) return 'High';
    if (intelligenceScore >= 60) return 'Medium';
    return 'Low';
  }

  /**
   * Generates human-readable reasons for the recommendation
   */
  private generateReasons(data: {
    awayTrend: { overCount: number; underCount: number; avgTotal: number };
    homeTrend: { overCount: number; underCount: number; avgTotal: number };
    paceScore: number;
    playerTrends: { hasHotStreak: boolean };
    recommendation: string;
  }): string[] {
    const reasons: string[] = [];
    const { awayTrend, homeTrend, paceScore, playerTrends, recommendation } = data;

    // Recent trend analysis
    const totalOvers = awayTrend.overCount + homeTrend.overCount;
    const totalGames = awayTrend.overCount + awayTrend.underCount + 
                       homeTrend.overCount + homeTrend.underCount;
    
    if (totalGames > 0) {
      const overPercentage = Math.round((totalOvers / totalGames) * 100);
      if (overPercentage >= 70) {
        reasons.push(`🔥 ${overPercentage}% dos jogos recentes foram Over`);
      } else if (overPercentage <= 30) {
        reasons.push(`❄️ ${100 - overPercentage}% dos jogos recentes foram Under`);
      }
    }

    // Pace analysis
    if (paceScore >= 70) {
      reasons.push('⚡ Ambos os times jogam em ritmo acelerado');
    } else if (paceScore <= 30) {
      reasons.push('🐌 Jogo com ritmo lento esperado');
    }

    // Player hot streak
    if (playerTrends.hasHotStreak) {
      reasons.push('🌟 Múltiplos jogadores em boa fase');
    }

    // Volume analysis
    const avgVolume = (awayTrend.avgTotal + homeTrend.avgTotal) / 2;
    if (avgVolume >= 230) {
      reasons.push(`📊 Média alta de pontos: ${Math.round(avgVolume)} pts`);
    } else if (avgVolume <= 210) {
      reasons.push(`📉 Média baixa de pontos: ${Math.round(avgVolume)} pts`);
    }

    // If no specific reasons, add a generic one
    if (reasons.length === 0) {
      reasons.push('📋 Análise baseada em dados históricos');
    }

    return reasons;
  }

  /**
   * Gets pace category from score
   */
  private getPaceCategory(paceScore: number): 'Fast' | 'Medium' | 'Slow' {
    if (paceScore >= 65) return 'Fast';
    if (paceScore >= 35) return 'Medium';
    return 'Slow';
  }

  /**
   * Returns default intelligence data when analysis fails
   */
  private getDefaultIntelligence(eventId: string): GameIntelligence {
    return {
      eventId,
      intelligenceScore: 50,
      overUnderProbability: 50,
      confidence: 'Low',
      trends: {
        recentOverUnder: '0/0 Over',
        teamPace: 'Medium',
        playerHotStreak: false,
        volumeIndicator: 220,
      },
      reasons: ['⚠️ Dados insuficientes para análise completa'],
      recommendation: 'SKIP',
      detailedAnalysis: {
        awayTeamTrend: { overCount: 0, underCount: 0, avgTotal: 220 },
        homeTeamTrend: { overCount: 0, underCount: 0, avgTotal: 220 },
        paceScore: 50,
      },
    };
  }

  /**
   * Ranks games by intelligence score
   */
  async rankGames(games: GameEvent[]): Promise<Array<{ game: GameEvent; intelligence: GameIntelligence }>> {
    const analyses = await Promise.all(
      games.map(async (game) => ({
        game,
        intelligence: await this.analyzeGame(game),
      }))
    );

    // Sort by intelligence score (highest first)
    return analyses.sort((a, b) => b.intelligence.intelligenceScore - a.intelligence.intelligenceScore);
  }
}

export const intelligenceService = new IntelligenceService();
