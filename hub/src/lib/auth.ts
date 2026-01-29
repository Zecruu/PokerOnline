import crypto from 'crypto';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'zecruu-games-secret-key-change-in-production';

// Generate JWT token
export function generateToken(userId: string, expiresIn: number = 24 * 60 * 60): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  
  return `${header}.${payload}.${signature}`;
}

// Verify JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    const [header, payload, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    if (data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return { userId: data.userId };
  } catch {
    return null;
  }
}

// Generate remember token
export function generateRememberToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash password
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Generate salt
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

