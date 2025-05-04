import { jwtVerify, type JWTPayload } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-replace-in-production';
const secretKey = new TextEncoder().encode(JWT_SECRET);

// Define a more specific payload type if possible
interface DecodedToken extends JWTPayload {
  userId: string;
  username: string;
  role: string;
  // iat and exp are automatically handled/verified by jose
}

/**
 * Verifies a JWT token using 'jose'.
 * Returns the decoded payload if valid, otherwise throws an error.
 * Compatible with Edge runtime.
 */
export async function verifyToken(token: string): Promise<DecodedToken> {
  try {
    const { payload } = await jwtVerify<DecodedToken>(token, secretKey, {
      // Specify expected algorithms if known, e.g., algorithms: ['HS256']
    });
    // Add any additional payload validation here if needed (e.g., check issuer 'iss')
    if (!payload.userId || !payload.username || !payload.role) {
        throw new Error('Token payload missing required fields');
    }
    return payload;
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    // Provide a generic error message for security
    throw new Error('Invalid or expired token');
  }
}
