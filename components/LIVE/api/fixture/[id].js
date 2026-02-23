module.exports = async function handler(req, res) {
  const APP_KEY = process.env.LIVE_APP_KEY;
  const origin = req.headers.origin || '';
  const allowedOrigin = process.env.FRONTEND_URL || origin || '*';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-App-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (APP_KEY) {
    const headerKey = req.headers['x-app-key'] || req.headers['X-App-Key'];
    if (!headerKey || headerKey !== APP_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Parâmetro id ausente' });
  }

  const url = `https://m2.sokkerpro.com/fixture/${id}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.status(response.status).json({ error: text || 'Erro na API externa' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
