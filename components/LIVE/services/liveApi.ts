// liveApi.ts

import axios from 'axios';

const API_BASE = '/api';

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
    visitorBallPossession?: number;
    localAttacksDangerousAttacks?: number;
    visitorAttacksDangerousAttacks?: number;
    localShotsOffGoal?: number;
    visitorShotsOffGoal?: number;
    localCorners?: number;
    visitorCorners?: number;
    raw?: any; // Original API response for detailed stats mapping
    starting_at?: string; // Adicionado para pré-live
}

export const liveApi = {
    // Fetch all live scores
    async getLiveScores() {
        try {
            const url = `${API_BASE}/livescores`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar live scores:', error);
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
            console.error(`Erro ao buscar detalhes do fixture ${fixtureId}:`, error);
            throw error;
        }
    },

    // Fetch Pre-Live fixtures
    async getPreLiveFixtures(date: string, page: number = 1, limit: number = 30) {
        try {
            const params = new URLSearchParams({
                is_live: 'false',
                last_games: 'l5',
                filter_type: 'home-away',
                timezone: '-4',
                page: page.toString(),
                sort: 'null',
                limit: limit.toString(),
            });

            // Removida barra extra antes do ?
            const url = `${API_BASE}/prelive/${date}?${params.toString()}`;

            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    // Se o proxy não estiver enviando, passe aqui (recomendo colocar em .env depois)
                    'accesstoken': '1c6bcf35-f69d', // ← ajuste ou use import.meta.env
                },
            });

            return response.data;
        } catch (error: any) {
            console.error('Erro ao buscar pré-live fixtures:', error);
            if (axios.isAxiosError(error) && error.response) {
                console.log('Status:', error.response.status);
                console.log('Resposta da API:', error.response.data);
                console.log('URL chamada:', error.config?.url);
            }
            throw error;
        }
    }
};