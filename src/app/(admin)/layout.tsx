'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Package, ShoppingCart, LayoutDashboard } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'; // Adjust path if needed
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

   if (!isAuthenticated) {
    // Although the effect redirects, this prevents rendering children briefly before redirect
    return null;
   }

  return (
    <SidebarProvider defaultOpen>
        <Sidebar>
            <SidebarHeader className="p-4 items-center flex flex-col">
                 {/* You can replace this with an actual logo if you have one */}
                 <div className="p-2 rounded-lg bg-primary/10 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-primary">
                         <path d="M12 2l-9 4.5v9l9 4.5 9-4.5v-9L12 2z"/>
                         <path d="M12 22V12"/>
                         <path d="M21 8.5l-9 4.5-9-4.5"/>
                         <path d="M3 13.5l9 4.5 9-4.5"/>
                         <path d="M12 12L3 7.5"/>
                         <path d="M12 12L21 7.5"/>
                     </svg>
                 </div>
                 <h2 className="text-xl font-semibold text-foreground">CozyAdmin</h2>
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href="/dashboard" passHref legacyBehavior>
                             <SidebarMenuButton tooltip="Dashboard" >
                                <LayoutDashboard />
                                <span>Dashboard</span>
                             </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <Link href="/products" passHref legacyBehavior>
                            <SidebarMenuButton tooltip="Products" >
                                <Package />
                                <span>Products</span>
                            </SidebarMenuButton>
                         </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <Link href="/orders" passHref legacyBehavior>
                            <SidebarMenuButton tooltip="Orders" >
                                <ShoppingCart />
                                <span>Orders</span>
                            </SidebarMenuButton>
                         </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-2 border-t border-sidebar-border">
                 <Button variant="ghost" onClick={logout} className="w-full justify-start">
                     <LogOut className="mr-2 h-4 w-4" />
                     Logout
                 </Button>
            </SidebarFooter>
        </Sidebar>
        <div className="flex flex-col flex-1 min-h-screen">
             <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2 md:hidden">
                 {/* Mobile Header Content - Trigger for Sidebar */}
                 <SidebarTrigger className="md:hidden"/>
                 <h2 className="text-lg font-semibold text-foreground">CozyAdmin</h2>
             </header>
             <main className="flex-1 overflow-auto p-4 md:p-6">
                {children}
            </main>
        </div>
    </SidebarProvider>
  );
}
