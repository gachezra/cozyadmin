import { NextResponse } from 'next/server';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { pbkdf2Hash } from '@/lib/cryptoUtils'; // Use the hashing function

// IMPORTANT: This route should ideally be protected or removed in production.
// It's intended for initial setup during development.
// You might restrict it by an environment variable or a secret key in the request.
const SEED_SECRET = process.env.SEED_SECRET || 'development-only-secret'; // Use an env variable

export async function POST(req: Request) {
  // --- Security Check ---
   const authHeader = req.headers.get('Authorization');
   const providedSecret = authHeader?.split(' ')[1]; // Expect "Bearer <secret>"

   if (process.env.NODE_ENV !== 'development' && providedSecret !== SEED_SECRET) {
      console.warn('Attempt to access seed route outside development or with invalid secret.');
      return NextResponse.json({ message: 'Forbidden: Seeding only allowed in development with secret' }, { status: 403 });
   }
   console.log('Seed route accessed (development/secret valid).');
  // --- End Security Check ---

  try {
    const usersRef = collection(db, 'users');
    const adminUsername = 'admin'; // Default admin username
    const adminPassword = 'password123'; // Default admin password - CHANGE THIS IMMEDIATELY AFTER SEEDING

    // Check if admin user already exists
    const q = query(usersRef, where('username', '==', adminUsername));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log(`Admin user '${adminUsername}' already exists. Skipping seed.`);
      return NextResponse.json({ message: 'Admin user already exists.' }, { status: 200 });
    }

    // Hash the password
    const passwordHash = await pbkdf2Hash(adminPassword);

    // Add the admin user
    await addDoc(usersRef, {
      username: adminUsername,
      passwordHash: passwordHash, // Store the 'salt:key' hash
      role: 'admin', // Assign the admin role
      createdAt: new Date(),
    });

    console.log(`Successfully seeded admin user '${adminUsername}'.`);
    return NextResponse.json({ message: `Admin user '${adminUsername}' seeded successfully.` }, { status: 201 });

  } catch (error: any) {
    console.error('Error seeding admin user:', error);
    return NextResponse.json({ message: 'Internal server error during seeding', error: error.message }, { status: 500 });
  }
}

// Handle GET requests or other methods if needed, maybe just return info
export async function GET() {
   if (process.env.NODE_ENV !== 'development') {
       return NextResponse.json({ message: 'Seeding information only available in development' }, { status: 403 });
   }
   return NextResponse.json({
        message: 'POST to this route with correct Authorization header (Bearer <SEED_SECRET>) in development to seed the initial admin user.',
        details: 'Default credentials (if seeded): admin / password123. CHANGE PASSWORD AFTER SEEDING.',
    }, { status: 200 });
}
