import { UserManager } from '@/lib/user-manager';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const { username, password, email } = await request.json();

    if (!username || !password) {
      return Response.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const userManager = new UserManager();
    const result = await userManager.addUser(username, password, email);

    // Create JWT token for the new user
    const token = jwt.sign(
      { 
        userId: result.userId,
        username: result.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    const response = Response.json({
      success: true,
      user: {
        username: result.username,
        email: email
      }
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.message === 'Username already exists') {
      return Response.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}