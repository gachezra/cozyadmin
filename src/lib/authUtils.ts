import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-replace-in-production';

interface DecodedToken {
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Verifies a JWT token.
 * Returns the decoded payload if valid, otherwise throws an error.
 */
export async function verifyToken(token: string): Promise<DecodedToken> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        reject(new Error('Invalid or expired token'));
      } else {
        resolve(decoded as DecodedToken);
      }
    });
  });
}
