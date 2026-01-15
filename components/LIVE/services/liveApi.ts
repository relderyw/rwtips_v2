
import axios from 'axios';

// Use relative paths to leverage Vite proxy in development
// In production, ensure the backend serves these routes or configure appropriate proxies
const API_BASE = ''; 

export interface LiveScore {
    id: number;
    leagueName: string;
    countryName: string;
    countryImagePath?: string;
    status: string;
    minute?: number;
    localTeamName: string;
    localTeamFlag?: string;
    scoresLocalTeam: number;
    visitorTeamName: string;
    visitorTeamFlag?: string;
    scoresVisitorTeam: number;
    events?: any;
    timeline?: any;
    calculatedHTLocal?: number | null;
    calculatedHTVisitor?: number | null;
    localAttacksAttacks?: number;
    visitorAttacksAttacks?: number;
    localShotsOnGoal?: number;
    visitorShotsOnGoal?: number;
    localBallPossession?: number;
    visitorBallPossession?: number;
}

export const liveApi = {
    // Fetch all live scores
    async getLiveScores() {
        try {
            const response = await axios.get('/api/livescores');
            return response.data;
        } catch (error) {
            console.error('Error fetching live scores:', error);
            throw error;
        }
    },

    // Fetch details for a specific fixture
    async getFixtureDetails(fixtureId: string | number) {
        try {
            const response = await axios.get(`/api/fixture/${fixtureId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching fixture details for ${fixtureId}:`, error);
            throw error;
        }
    }
};
