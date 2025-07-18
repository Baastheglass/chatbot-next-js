import { apiPost } from '@/lib/api-client';

export async function POST(request) {
  try {
    // Forward request to Python backend
    const response = await apiPost('/create_session', {});
    
    if (response) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    }
    
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  } catch (error) {
    console.error('Create session API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}