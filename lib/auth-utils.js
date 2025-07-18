import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function getAuthenticatedUser(request = null) {
  try {
    let token;
    
    if (request) {
      // For API routes that receive request object
      token = request.cookies.get('auth-token');
    } else {
      // For server components
      const cookieStore = cookies();
      token = cookieStore.get('auth-token');
    }

    if (!token) {
      return null;
    }

    // Verify JWT token
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET);
    
    return {
      userId: decoded.userId,
      username: decoded.username
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export function createAuthResponse(data, status = 200) {
  return Response.json(data, { status });
}

export function createUnauthorizedResponse() {
  return Response.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}