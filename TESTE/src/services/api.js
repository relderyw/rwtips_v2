// Use proxy serverless sem CORS em produção (Vercel: /api/*)
const API_BASE_URL = '';

// Helper para fetch com timeout e mensagens melhores
async function fetchJson(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      cache: 'no-store'
    });
    clearTimeout(id);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Erro ${response.status}: ${text || response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Tempo de resposta excedido. Tente novamente.');
    }
    throw error;
  }
}

export const api = {
  // Buscar todos os jogos
  async getLiveScores() {
    try {
      return await fetchJson(`/api/livescores`);
    } catch (error) {
      console.error('Erro na API getLiveScores:', error);
      throw error;
    }
  },

  // Buscar detalhes de uma partida específica
  async getFixtureDetails(fixtureId) {
    try {
      return await fetchJson(`/api/fixture/${fixtureId}`);
    } catch (error) {
      console.error('Erro na API getFixtureDetails:', error);
      throw error;
    }
  }
};