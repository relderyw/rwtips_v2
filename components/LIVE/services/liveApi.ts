
import axios from 'axios';

// Em produção, usa o backend próprio no Render (que atua como Proxy)
// Em desenvolvimento, usa o proxy do Vite ('')
const API_BASE = import.meta.env.PROD 
    ? 'https://rwtips-r943.onrender.com/api' 
    : '/api';

export interface LiveScore {
    id: number;
    fixtureId?: string; // Mapped from fixtureId in API
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
            const url = `${API_BASE}/livescores`;
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
            const url = `${API_BASE}/fixture/${fixtureId}`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error(`Error fetching fixture details for ${fixtureId}:`, error);
            throw error;
        }
    }
};
