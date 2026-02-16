import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import { generateToken, generateSalt, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return NextResponse.json(
        { error: existingUser.email === email.toLowerCase() ? 'Email already registered' : 'Username already taken' },
        { status: 400 }
      );
    }

    // Create user
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const user = new User({
      email: email.toLowerCase(),
      username,
      passwordHash,
      salt,
      library: [], // Start with empty library (free games are added automatically)
      wishlist: [],
      favorites: [],
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        isTester: user.isTester || false,
        library: user.library || [],
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

