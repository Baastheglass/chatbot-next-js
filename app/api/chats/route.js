import { getAuthenticatedUser, createAuthResponse, createUnauthorizedResponse } from '@/lib/auth-utils';
import { UserManager } from '@/lib/user-manager';

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return createUnauthorizedResponse();
    }

    const userManager = new UserManager();
    const chats = await userManager.getUserChats(user.username);
    
    return createAuthResponse({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { title } = await request.json();
    
    if (!title) {
      return Response.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Forward request to FastAPI backend
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        user_email: user.username
      }),
    });

    if (!backendResponse.ok) {
      throw new Error('Backend request failed');
    }

    const data = await backendResponse.json();
    return createAuthResponse(data);
  } catch (error) {
    console.error('Error creating chat:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}