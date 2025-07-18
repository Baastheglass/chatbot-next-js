import { apiGet, apiPost } from '@/lib/api-client';

export async function GET(request, { params }) {
  try {
    const { chatId } = params;
    
    // Forward request to Python backend
    const response = await apiGet(`/chats/${chatId}/messages`);
    
    if (response) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    }
    
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  } catch (error) {
    console.error('Get chat messages API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { chatId } = params;
    const body = await request.json();
    
    // Forward request to Python backend
    const response = await apiPost(`/chats/${chatId}/messages`, body);
    
    if (response) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    }
    
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  } catch (error) {
    console.error('Post chat message API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}