import { Handler, HandlerEvent } from '@netlify/functions';
import axios from 'axios';

const BOT_BASE_URL = 'https://rwtips-r943.onrender.com';

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  console.log('[send-screenshot] Received request, forwarding to bot...');

  try {
    const payload = event.body
      ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body)
      : {};

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Forward auth headers
    if (event.headers['x-api-key']) headers['X-API-Key'] = event.headers['x-api-key'];
    if (event.headers['authorization']) headers['Authorization'] = event.headers['authorization'];

    const response = await axios.post(`${BOT_BASE_URL}/api/send-screenshot`, payload, {
      headers,
      timeout: 25000,
      maxBodyLength: 20 * 1024 * 1024, // 20MB
      maxContentLength: 20 * 1024 * 1024,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response.data),
    };
  } catch (error: any) {
    console.error('[send-screenshot] Error:', error.message, error.response?.data);
    return {
      statusCode: error.response?.status || 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to send screenshot via bot',
        details: error.message,
        botError: error.response?.data,
      }),
    };
  }
};
