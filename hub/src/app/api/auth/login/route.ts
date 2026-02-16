import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import { generateToken, generateRememberToken, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email || body.login; // Support both field names
    const { password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if banned
    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Your account has been banned' },
        { status: 403 }
      );
    }

    // Verify password
    const passwordHash = hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate remember token if requested
    let rememberToken = null;
    if (rememberMe) {
      rememberToken = generateRememberToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Clean up old tokens (keep max 5)
      if (user.rememberTokens.length >= 5) {
        user.rememberTokens = user.rememberTokens.slice(-4);
      }
      
      user.rememberTokens.push({
        token: rememberToken,
        deviceInfo: request.headers.get('user-agent') || 'Unknown',
        expiresAt,
      });
    }

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString(), rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60);

    return NextResponse.json({
      success: true,
      token,
      rememberToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        isTester: user.isTester || false,
        library: user.library,
        wishlist: user.wishlist,
        favorites: user.favorites,
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

