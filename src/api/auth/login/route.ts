import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SignJWT } from 'jose'; // Use jose for signing
import { pbkdf2Verify } from '@/lib/cryptoUtils';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-replace-in-production';
const JWT_EXPIRATION = '1h'; // Token expiration time
const secretKey = new TextEncoder().encode(JWT_SECRET); // Encode secret for jose

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    // 1. Find user by username in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`Login attempt failed: User not found - ${username}`);
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // 2. Verify password using pbkdf2Verify
    const storedHash = userData.passwordHash; // Use passwordHash field
    if (!storedHash) {
        console.error(`Login error: No passwordHash found for user ${username}`);
        return NextResponse.json({ message: 'Authentication configuration error' }, { status: 500 });
    }

    const isValidPassword = await pbkdf2Verify(storedHash, password);

    if (!isValidPassword) {
      console.log(`Login attempt failed: Invalid password - ${username}`);
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // 3. Check for admin role
    if (userData.role !== 'admin') {
      console.log(`Login attempt denied: Not an admin - ${username}`);
      return NextResponse.json({ message: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    // 4. Generate JWT using jose
    const tokenPayload = {
      userId: userDoc.id,
      username: userData.username,
      role: userData.role,
    };

    const token = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' }) // Specify the algorithm
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION)
      .sign(secretKey); // Sign with the encoded secret

    console.log(`Login successful: ${username}`);
    return NextResponse.json({ token }, { status: 200 });

  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ message: 'Internal server error during login', error: error.message }, { status: 500 });
  }
}
