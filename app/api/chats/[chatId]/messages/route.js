import { getAuthenticatedUser, createAuthResponse, createUnauthorizedResponse } from '@/lib/auth-utils';

export async function GET(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { chatId } = params;

    // Forward request to FastAPI backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chats/${chatId}/messages`, {
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
    console.error('Error fetching messages:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { chatId } = params;
    const body = await request.json();

    // Forward request to FastAPI backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      throw new Error('Backend request failed');
    }

    const data = await backendResponse.json();
    return createAuthResponse(data);
  } catch (error) {
    console.error('Error posting message:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}