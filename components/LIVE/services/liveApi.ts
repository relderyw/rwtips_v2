
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE
    || (import.meta.env.PROD ? 'https://m2.sokkerpro.com' : '');

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
            const url = API_BASE ? `${API_BASE}/livescores` : '/api/livescores';
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching live scores:', error);
            throw error;
        }
    },

    // Fetch details for a specific fixture
    async getFixtureDetails(fixtureId: string | number) {
        try {
            const url = API_BASE ? `${API_BASE}/fixture/${fixtureId}` : `/api/fixture/${fixtureId}`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error(`Error fetching fixture details for ${fixtureId}:`, error);
            throw error;
        }
    }
};
