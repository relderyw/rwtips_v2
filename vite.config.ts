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
                        proxyReq.setHeader('Referer', 'https://sokkerpro.com/');
                        // Minimal headers to match working TESTE environment
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
                        proxyReq.setHeader('Referer', 'https://sokkerpro.com/');
                        // Minimal headers to match working TESTE environment
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
