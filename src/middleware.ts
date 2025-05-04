import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/authUtils'; // Assuming verifyToken utility exists

// Define paths that should be protected by authentication
const protectedApiPaths = [
  '/api/products', // Example: Add specific protected routes or use a broader pattern
  '/api/orders',   // Example
  // Add other protected API routes here
  // Avoid protecting '/api/auth/login'
];

// Define paths accessible without authentication
const publicPaths = [
    '/login', // The login page itself
    '/api/auth/login', // The login API endpoint
    // Add other public paths like '/_next/', '/favicon.ico' etc. if needed
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Simple check to exclude static files and framework internals
  if (pathname.startsWith('/_next/') || pathname.includes('.') || publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const isProtectedApi = protectedApiPaths.some(path => pathname.startsWith(path));
  const isProtectedPage = !publicPaths.includes(pathname) && !isProtectedApi && !pathname.startsWith('/api/'); // Rough check for non-API, non-public pages

  // --- API Route Protection ---
  if (isProtectedApi) {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1]; // Bearer <token>

    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    try {
      const decoded = await verifyToken(token);
      if (!decoded || decoded.role !== 'admin') { // Ensure user has admin role
        throw new Error('Invalid token or insufficient permissions');
      }
      // Token is valid and user is admin, proceed
      // Optionally add decoded user info to request headers for API routes
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('X-User-Info', JSON.stringify(decoded)); // Pass user info
      return NextResponse.next({
          request: {
              headers: requestHeaders,
          },
      });
    } catch (error) {
      console.error('API Auth Error:', error);
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }
  }

   // --- Page Route Protection ---
   // This is primarily handled by the AuthProvider now, but middleware can add an extra layer
   // or handle server-side redirects before the client-side AuthProvider kicks in.
   // We can check for the token cookie *if* we decide to set one server-side,
   // but relying on client-side localStorage is the current approach via AuthProvider.
   // Let's keep this minimal or remove if AuthProvider is sufficient.
    // if (isProtectedPage) {
    //     // Example: Check for a cookie if you were setting one server-side
    //     // const tokenCookie = req.cookies.get('adminToken');
    //     // if (!tokenCookie) {
    //     //     const loginUrl = new URL('/login', req.url);
    //     //     return NextResponse.redirect(loginUrl);
    //     // }
    //     // // Optional: Verify cookie token server-side here as well
    // }


  // If not a protected API or page, allow the request
  return NextResponse.next();
}

// Define which paths the middleware should run on
export const config = {
    matcher: [
      /*
       * Match all request paths except for the ones starting with:
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico (favicon file)
       * - /login (login page)
       * - /api/auth/login (login API) - handled explicitly above
       * Match API routes explicitly if needed, or rely on the logic within the middleware.
       */
      '/((?!_next/static|_next/image|favicon.ico|login|api/auth/login).*)',
      // Explicitly include API paths if the above pattern is too broad or complex
      // '/api/:path*', // Example: Match all API routes (excluding login)
    ],
};
