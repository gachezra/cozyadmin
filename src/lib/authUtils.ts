import { jwtVerify, type JWTPayload } from 'jose';
import { TextEncoder } from 'util'; // Use TextEncoder for Edge compatibility

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'fallback-secret-key-replace-in-production';
// Convert the secret string to a Uint8Array using TextEncoder for Edge compatibility
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

interface DecodedToken extends JWTPayload {
  userId: string;
  username: string;
  role: string;
  // iat and exp are automatically included by jose in JWTPayload
}

/**
 * Verifies a JWT token using jose.
 * Returns the decoded payload if valid, otherwise throws an error.
 */
export async function verifyToken(token: string): Promise<DecodedToken> {
  try {
    // Pass the Uint8Array secret directly to jwtVerify
    const { payload } = await jwtVerify<DecodedToken>(token, JWT_SECRET);

    // We can add additional checks here if needed (e.g., audience, issuer)
    // Ensure the payload matches the expected structure (TypeScript helps here)
    if (typeof payload.userId !== 'string' || typeof payload.username !== 'string' || typeof payload.role !== 'string') {
        throw new Error('Invalid token payload structure');
    }
    return payload;
  } catch (error: any) {
    console.error('Token verification failed:', error.message, 'Code:', error.code);
    // Check error.code for specific jose errors
    if (error.code === 'ERR_JWT_EXPIRED') {
        throw new Error('Token expired');
    } else if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        throw new Error('Invalid token signature');
    } else if (error.code === 'ERR_JWS_INVALID') {
         throw new Error('Invalid token format');
    }
    // General fallback
    throw new Error('Invalid token');
  }
}
