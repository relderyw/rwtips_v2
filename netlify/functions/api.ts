import { Handler, HandlerEvent } from '@netlify/functions';
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://m2.sokkerpro.com',
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://sokkerpro.com/',
    'Origin': 'https://sokkerpro.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/125.0.0.0',
    'sec-ch-ua': '"Opera Air";v="125", "Not?A_Brand";v="8", "Chromium";v="141"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site'
  },
});

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || '*';
const PUBLIC_APP_KEY = process.env.PUBLIC_APP_KEY;

export const handler: Handler = async (event: HandlerEvent) => {
  if (PUBLIC_APP_KEY) {
    const headerKey = event.headers['x-app-key'] || event.headers['X-App-Key'];
    if (!headerKey || headerKey !== PUBLIC_APP_KEY) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
        },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }
  }
  // Extract path relative to /api
  // event.path will be something like "/.netlify/functions/api" or "/api/livescores" depending on rewrite
  // We need to determine the target endpoint at m2.sokkerpro.com
  
  // The redirect in netlify.toml is: /api/* -> /.netlify/functions/api
  // We need to support:
  // 1. /api/livescores -> /livescores
  // 2. /api/fixture/123 -> /fixture/123

  // Simple parsing of the original URL from the event
  // Netlify often passes the full path in event.path or via headers
  
  let targetPath = '';
  
  // Try to reconstruct the intended path from the event
  // If the request was /api/livescores, we want /livescores
  const pathParts = event.path.split('/');
  
  // Find where 'api' is and take everything after
  // This is a robust way to handle both local and rewritten paths
  const apiIndex = pathParts.indexOf('api');
  
  if (apiIndex !== -1 && apiIndex < pathParts.length - 1) {
    targetPath = '/' + pathParts.slice(apiIndex + 1).join('/');
  } else if (event.path.includes('.netlify/functions/api')) {
      // In some cases (direct invoke), we might need query params or a different strategy,
      // but usually the rewrite preserves the structure or we pass it as a query param if needed.
      // However, for the standard rewrite /api/foo -> function, 
      // let's look at the original Request URL if possible, or assume the client sends the path.
      
      // Let's rely on a query param if the path parsing failed, OR assume the last segment is the resource
      // But standard way:
      // If we request /api/livescores, path might be /.netlify/functions/api/livescores
      
      const functionIndex = pathParts.indexOf('api'); // matches functions/api
       if (functionIndex !== -1 && functionIndex < pathParts.length - 1) {
            targetPath = '/' + pathParts.slice(functionIndex + 1).join('/');
       }
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Key',
      },
      body: '',
    };
  }

  // Fallback: If we can't detect path, check if it's livescores or fixture based on typical usage
  // Ideally, we'd log this to see what Netlify actually sends.
  
  // ADAPTATION: To make this robust, let's look for known segments
  if (event.path.includes('livescores')) {
    targetPath = '/livescores';
  } else if (event.path.includes('fixture')) {
      const match = event.path.match(/fixture\/(\d+)/);
      if (match) {
          targetPath = `/fixture/${match[1]}`;
      }
  } else if (event.path.includes('sensor-matches')) {
      // Direct call to SensorFIFA API from Netlify Function
      const limit = event.queryStringParameters?.limit || '200';
      const offset = event.queryStringParameters?.offset || '0';
      console.log(`[Proxy] Fetching from SensorFIFA: limit=${limit}, offset=${offset}`);
      
      try {
          const response = await axios.get('https://sensorfifa.com.br/api/matches/', {
              params: { limit, offset },
              headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              timeout: 8000 // Tight timeout to avoid Netlify 10s limit
          });
          
          console.log(`[Proxy] SensorFIFA success: ${response.data?.partidas?.length || 0} matches`);
          return {
              statusCode: 200,
              headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
              },
              body: JSON.stringify(response.data),
          };
      } catch (error: any) {
          console.error('[Proxy Error] SensorFIFA:', error.message);
          return {
              statusCode: error.response?.status || 500,
              body: JSON.stringify({ 
                  error: 'Failed to fetch SensorFIFA data', 
                  details: error.message,
                  source: 'Netlify Function'
              }),
          };
      }
  } else if (event.path.includes('app3')) {
      // Proxy to CaveiraTips API
      console.log(`[Proxy] Forwarding to CaveiraTips: ${event.path}`);
      const baseUrl = "https://app3.caveiratips.com.br";
      
      // Clean up path: remove /api/app3 prefixes to get the target path
      let caveiraPath = event.path.replace(/^\/api\/app3/, '/api').replace(/^\/\.netlify\/functions\/api\/app3/, '/api');
      
      try {
          const config: any = {
              method: event.httpMethod,
              url: `${baseUrl}${caveiraPath}`,
              params: event.queryStringParameters,
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
          };

          if (event.body) {
              config.data = JSON.parse(event.body);
          }

          const response = await axios(config);
          return {
              statusCode: 200,
              headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
              },
              body: JSON.stringify(response.data),
          };
      } catch (error: any) {
          console.error('[Proxy Error] CaveiraTips:', error.message);
          return {
              statusCode: error.response?.status || 500,
              body: JSON.stringify({ error: 'Failed to fetch CaveiraTips data', details: error.message }),
          };
      }
  } else if (event.path.includes('statshub')) {
      // Proxy to StatsHub API
      console.log(`[Proxy] Forwarding to StatsHub: ${event.path}`);
      const baseUrl = "https://www.statshub.com";
      
      // Clean up path: remove /api/statshub prefixes to get the target path
      let statshubPath = event.path.replace(/^\/api\/statshub/, '/api').replace(/^\/\.netlify\/functions\/api\/statshub/, '/api');
      
      try {
          const config: any = {
              method: event.httpMethod,
              url: `${baseUrl}${statshubPath}`,
              params: event.queryStringParameters,
              headers: {
                  'Accept': 'application/json, text/plain, */*',
                  'Content-Type': 'application/json',
                  'Origin': 'https://www.statshub.com',
                  'Referer': 'https://www.statshub.com/',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
              }
          };

          if (event.body) {
              try {
                  config.data = JSON.parse(event.body);
              } catch (e) {
                  config.data = event.body;
              }
          }

          const response = await axios(config);
          return {
              statusCode: 200,
              headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
              },
              body: JSON.stringify(response.data),
          };
      } catch (error: any) {
          console.error('[Proxy Error] StatsHub:', error.message);
          return {
              statusCode: error.response?.status || 500,
              body: JSON.stringify({ error: 'Failed to fetch StatsHub data', details: error.message }),
          };
      }
  }

  if (!targetPath) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
      },
      body: JSON.stringify({ error: 'Could not determine target endpoint', path: event.path }),
    };
  }

  console.log(`[Proxy] Forwarding to: ${targetPath}`);

  try {
    const response = await api.get(targetPath);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
      },
      body: JSON.stringify(response.data),
    };
  } catch (error: any) {
    console.error(`[Proxy Error] ${targetPath}:`, error.message);
    return {
      statusCode: error.response?.status || 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
      },
      body: JSON.stringify({ error: 'Failed to fetch data', details: error.message }),
    };
  }
};
