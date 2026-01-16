import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
            '/api/livescores': {
                target: 'https://m2.sokkerpro.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
                secure: false,
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, _req, _res) => {
                        proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
                        proxyReq.setHeader('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');
                        proxyReq.setHeader('Referer', 'https://sokkerpro.com/');
                        proxyReq.setHeader('Origin', 'https://sokkerpro.com');
                        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/125.0.0.0');
                        proxyReq.setHeader('sec-ch-ua', '"Opera Air";v="125", "Not?A_Brand";v="8", "Chromium";v="141"');
                        proxyReq.setHeader('sec-ch-ua-mobile', '?0');
                        proxyReq.setHeader('sec-ch-ua-platform', '"Windows"');
                        proxyReq.setHeader('sec-fetch-dest', 'empty');
                        proxyReq.setHeader('sec-fetch-mode', 'cors');
                        proxyReq.setHeader('sec-fetch-site', 'same-site');
                    });
                }
            },
            '/api/fixture': {
                target: 'https://m2.sokkerpro.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
                secure: false,
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, _req, _res) => {
                        proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
                        proxyReq.setHeader('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');
                        proxyReq.setHeader('Referer', 'https://sokkerpro.com/');
                        proxyReq.setHeader('Origin', 'https://sokkerpro.com');
                        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/125.0.0.0');
                        proxyReq.setHeader('sec-ch-ua', '"Opera Air";v="125", "Not?A_Brand";v="8", "Chromium";v="141"');
                        proxyReq.setHeader('sec-ch-ua-mobile', '?0');
                        proxyReq.setHeader('sec-ch-ua-platform', '"Windows"');
                        proxyReq.setHeader('sec-fetch-dest', 'empty');
                        proxyReq.setHeader('sec-fetch-mode', 'cors');
                        proxyReq.setHeader('sec-fetch-site', 'same-site');
                    });
                }
            }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@/lib': path.resolve(__dirname, './components/FUT/lib'),
          '@/hooks': path.resolve(__dirname, './components/FUT/hooks'),
          '@/components': path.resolve(__dirname, './components/FUT/components'),
          '@/app': path.resolve(__dirname, './components/FUT/app'),
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
