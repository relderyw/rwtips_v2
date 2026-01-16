import { Handler, HandlerEvent } from '@netlify/functions';
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://m2.sokkerpro.com',
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://sokkerpro.com/',
    'Origin': 'https://sokkerpro.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

export const handler: Handler = async (event: HandlerEvent) => {
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
  }

  if (!targetPath) {
    return {
      statusCode: 400,
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
        'Access-Control-Allow-Origin': '*', // CORS for public access
      },
      body: JSON.stringify(response.data),
    };
  } catch (error: any) {
    console.error(`[Proxy Error] ${targetPath}:`, error.message);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ error: 'Failed to fetch data', details: error.message }),
    };
  }
};
