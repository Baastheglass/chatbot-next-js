import { getAuthenticatedUser, createAuthResponse, createUnauthorizedResponse } from '@/lib/auth-utils';

export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { chatId } = params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // Forward request to FastAPI backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chats/${chatId}/load_recent_context?sessionId=${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      throw new Error('Backend request failed');
    }

    const data = await backendResponse.json();
    return createAuthResponse(data);
  } catch (error) {
    console.error('Error loading recent context:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}