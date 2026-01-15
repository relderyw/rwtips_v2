const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const livescores = require('./api/livescores');
const fixture = require('./api/fixture/[id]');

const app = express();
const PORT = process.env.PORT || 3000;
const REACT_PORT = 3001;

// Middleware para parsing JSON
app.use(express.json());

// Middleware de log para debug
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Rotas da API - DEVEM vir antes do proxy
app.all('/api/livescores', async (req, res) => {
  console.log(`${req.method} /api/livescores - chamando handler`);
  try {
    await livescores(req, res);
  } catch (error) {
    console.error('Erro no handler livescores:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Erro interno' });
    }
  }
});

app.all('/api/fixture/:id', async (req, res) => {
  console.log(`${req.method} /api/fixture/${req.params.id} - chamando handler`);
  req.query = { id: req.params.id };
  try {
    await fixture(req, res);
  } catch (error) {
    console.error('Erro no handler fixture:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Erro interno' });
    }
  }
});

// Servir arquivos estáticos em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  // Em desenvolvimento, fazer proxy para o React dev server
  // Apenas para rotas que NÃO começam com /api
  app.use(
    createProxyMiddleware({
      target: `http://localhost:${REACT_PORT}`,
      changeOrigin: true,
      ws: true, // Para WebSocket do hot reload
      filter: (pathname, req) => {
        // Não fazer proxy de rotas da API
        const shouldProxy = !pathname.startsWith('/api');
        console.log(`Proxy filter: ${pathname} -> ${shouldProxy ? 'PROXY' : 'SKIP'}`);
        return shouldProxy;
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying: ${req.method} ${req.path} -> ${REACT_PORT}`);
      },
      onError: (err, req, res) => {
        console.error('Erro no proxy:', err.message);
        if (!res.headersSent) {
          res.status(500).send('Erro ao conectar com o servidor React');
        }
      }
    })
  );
}

app.listen(PORT, () => {
  console.log(`\n=== Servidor Express iniciado ===`);
  console.log(`Porta: ${PORT}`);
  console.log(`API disponível em http://localhost:${PORT}/api`);
  console.log(`Rotas registradas:`);
  console.log(`  - GET/POST/OPTIONS /api/livescores`);
  console.log(`  - GET/POST/OPTIONS /api/fixture/:id`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Frontend React deve rodar na porta ${REACT_PORT}`);
  }
  console.log(`================================\n`);
});

