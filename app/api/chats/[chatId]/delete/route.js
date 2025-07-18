import { apiPost } from '@/lib/api-client';

export async function POST(request, { params }) {
  try {
    const { chatId } = params;
    
    // Forward request to Python backend
    const response = await apiPost(`/chats/${chatId}/delete`, {});
    
    if (response) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    }
    
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  } catch (error) {
    console.error('Delete chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}