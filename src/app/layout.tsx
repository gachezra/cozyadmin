import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import { QueryClientProviderWrapper } from '@/context/QueryClientProvider'; // Assuming QueryClientProviderWrapper exists

export const metadata: Metadata = {
  title: 'CozyAdmin Dashboard',
  description: 'Admin dashboard for Cozy Crochets',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`antialiased font-sans`}>
        <QueryClientProviderWrapper>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </QueryClientProviderWrapper>
      </body>
    </html>
  );
}
