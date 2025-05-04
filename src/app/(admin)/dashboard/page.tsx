'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Users } from 'lucide-react'; // Assuming Users icon exists or use a placeholder
import { useAuth } from '@/context/AuthContext'; // Ensure useAuth is correctly imported
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Skeleton } from '@/components/ui/skeleton';


const fetchDashboardData = async () => {
    // Fetch total products
    const productsCollection = collection(db, 'products');
    const productsSnapshot = await getDocs(productsCollection);
    const totalProducts = productsSnapshot.size;

    // Fetch pending orders (status is "Received" or "Pending")
    const ordersCollection = collection(db, 'orders');
    const pendingOrdersQuery = query(ordersCollection, where('orderStatus', 'in', ['Received', 'Pending']));
    const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
    const pendingOrdersCount = pendingOrdersSnapshot.size;

    // Optional: Fetch total users (if needed, though only admin exists now)
    // const usersCollection = collection(db, 'users');
    // const usersSnapshot = await getDocs(usersCollection);
    // const totalUsers = usersSnapshot.size;

    return {
        totalProducts,
        pendingOrdersCount,
        // totalUsers
    };
};


export default function DashboardPage() {
    const { isAuthenticated } = useAuth(); // Use auth context if needed

    const { data, isLoading, error } = useQuery({
       queryKey: ['dashboardData'],
       queryFn: fetchDashboardData,
       enabled: isAuthenticated, // Only fetch if authenticated
       staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    if (!isAuthenticated) {
        // This should ideally be handled by the layout, but as a fallback
        return null;
    }

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-6 text-foreground">Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-1/3" />
                         ) : error ? (
                             <p className="text-xs text-destructive">Error loading</p>
                         ) : (
                            <div className="text-2xl font-bold">{data?.totalProducts ?? 0}</div>
                         )}
                         <p className="text-xs text-muted-foreground">
                             Total products listed in the store.
                         </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {isLoading ? (
                             <Skeleton className="h-8 w-1/4" />
                         ) : error ? (
                             <p className="text-xs text-destructive">Error loading</p>
                         ) : (
                             <div className="text-2xl font-bold">{data?.pendingOrdersCount ?? 0}</div>
                         )}
                         <p className="text-xs text-muted-foreground">
                             Orders awaiting processing or completion.
                         </p>
                    </CardContent>
                </Card>

                 {/* Optional: Total Users Card
                 <Card>
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                         <Users className="h-4 w-4 text-muted-foreground" />
                     </CardHeader>
                     <CardContent>
                         {isLoading ? (
                             <Skeleton className="h-8 w-1/4" />
                         ) : error ? (
                             <p className="text-xs text-destructive">Error loading</p>
                         ) : (
                            <div className="text-2xl font-bold">{data?.totalUsers ?? 0}</div>
                         )}
                         <p className="text-xs text-muted-foreground">
                             Registered users (including admins).
                         </p>
                     </CardContent>
                 </Card>
                 */}
            </div>

            {/* You can add more sections here, like recent orders, quick links, etc. */}
            {/* Example:
            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
                 <Card>
                     <CardContent className="p-6">
                         <p>Placeholder for recent orders or product updates.</p>
                     </CardContent>
                 </Card>
             </div>
             */}
        </div>
    );
}
