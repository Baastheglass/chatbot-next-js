import { apiGet } from '@/lib/api-client';

export async function GET(request, { params }) {
  try {
    const { chatId } = params;
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    // Forward request to Python backend
    const response = await apiGet(`/chats/${chatId}/load_recent_context?sessionId=${sessionId}`);
    
    if (response) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    }
    
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  } catch (error) {
    console.error('Load recent context API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}