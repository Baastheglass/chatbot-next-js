import { getAuthenticatedUser, createAuthResponse, createUnauthorizedResponse } from '@/lib/auth-utils';

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();

    // Forward request to FastAPI backend with all headers
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenRouter-API-Key': request.headers.get('X-OpenRouter-API-Key') || '',
        'X-OpenRouter-Model': request.headers.get('X-OpenRouter-Model') || '',
        'X-System-Prompt': request.headers.get('X-System-Prompt') || '',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      throw new Error('Backend request failed');
    }

    const data = await backendResponse.json();
    return createAuthResponse(data);
  } catch (error) {
    console.error('Chat error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}