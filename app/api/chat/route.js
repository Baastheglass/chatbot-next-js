import { apiPost } from '@/lib/api-client';

export async function POST(request) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Get headers for OpenRouter settings
    const openRouterHeaders = {};
    const apiKey = request.headers.get("X-OpenRouter-API-Key");
    const model = request.headers.get("X-OpenRouter-Model");
    const systemPrompt = request.headers.get("X-System-Prompt");
    
    if (apiKey) openRouterHeaders["X-OpenRouter-API-Key"] = apiKey;
    if (model) openRouterHeaders["X-OpenRouter-Model"] = model;
    if (systemPrompt) openRouterHeaders["X-System-Prompt"] = systemPrompt;
    
    // Forward request to Python backend
    const response = await apiPost('/chat', body, {
      headers: openRouterHeaders
    });
    
    if (response) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    }
    
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}