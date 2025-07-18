import { apiPost } from '@/lib/api-client';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Forward request to Python backend
    const response = await apiPost('/diagram', body);
    
    if (response) {
      const data = await response.json();
      return Response.json(data, { status: response.status });
    }
    
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  } catch (error) {
    console.error('Diagram API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}