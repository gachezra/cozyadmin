'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    // TODO: Add token validation logic here (e.g., check expiration, verify signature with backend)
    // For now, just check if it exists
    if (storedToken) {
      setTokenState(storedToken);
    } else {
       setTokenState(null); // Ensure token is null if not found
    }
    setIsLoading(false);
  }, []);

   useEffect(() => {
    if (!isLoading) {
      const isLoginPage = pathname === '/login';
      const publicPaths = ['/login']; // Add other public paths if needed

      if (!token && !publicPaths.includes(pathname)) {
        console.log('No token found, redirecting to login from:', pathname);
        router.push('/login');
      } else if (token && isLoginPage) {
        console.log('Token found, redirecting from login to dashboard');
        router.push('/dashboard');
      }
    }
   }, [token, isLoading, pathname, router]);


  const setToken = (newToken: string | null) => {
    setIsLoading(true);
    if (newToken) {
      localStorage.setItem('adminToken', newToken);
    } else {
      localStorage.removeItem('adminToken');
    }
    setTokenState(newToken);
    setIsLoading(false);
     // Re-evaluate route after token change
    if (!newToken && pathname !== '/login') {
      router.push('/login');
    } else if (newToken && pathname === '/login') {
      router.push('/dashboard');
    }
  };

  const logout = () => {
    setToken(null);
    router.push('/login');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, setToken, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
