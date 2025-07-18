import { getAuthenticatedUser, createAuthResponse, createUnauthorizedResponse } from '@/lib/auth-utils';

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();

    // Forward request to FastAPI backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/mcq`, {
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
    console.error('MCQ error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}