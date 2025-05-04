'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, AlertCircle, Eye, ShoppingBag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Order } from '@/types/order';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

type OrderStatus = "Received" | "Pending" | "Done";
const ALL_STATUSES: OrderStatus[] = ["Received", "Pending", "Done"];

const fetchOrders = async (filters: { status: OrderStatus | 'all', searchTerm: string }): Promise<Order[]> => {
    const ordersCollection = collection(db, 'orders');
    let q = query(ordersCollection, orderBy('timestamp', 'desc')); // Default sort by newest

    // Apply status filter
    if (filters.status !== 'all') {
        q = query(q, where('orderStatus', '==', filters.status));
    }

    // Apply search filter (basic search on customerName or orderId)
     if (filters.searchTerm) {
         // Firestore doesn't support OR queries easily across different fields without composite indexes for everything.
         // A common workaround is to fetch based on one field or fetch all and filter client-side for simple cases,
         // or use a dedicated search service (like Algolia/Elasticsearch) for complex searching.
         // For this basic case, we'll query by orderId first, then customerName if no results. This isn't ideal.
         // A better Firestore approach might involve denormalizing searchable terms into an array field.

         // Let's just filter client-side after fetching based on status for simplicity here.
         // const nameQuery = query(q, where('customerName', '>=', filters.searchTerm), where('customerName', '<=', filters.searchTerm + '\uf8ff'));
         // const idQuery = query(q, where('orderId', '==', filters.searchTerm));
         // For now, we won't apply server-side search filtering due to complexity.
     }


    const snapshot = await getDocs(q);
    let orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id, // Use Firestore doc ID as the main ID
            ...data,
            // Ensure timestamp is a Date object
             timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp), // Handle potential string dates if any exist
        } as Order;
    });

     // Client-side filtering for search term
     if (filters.searchTerm) {
         const lowerCaseSearch = filters.searchTerm.toLowerCase();
         orders = orders.filter(order =>
             order.customerName?.toLowerCase().includes(lowerCaseSearch) ||
             order.orderId?.toLowerCase().includes(lowerCaseSearch) ||
             order.customerEmail?.toLowerCase().includes(lowerCaseSearch)
         );
     }

    return orders;
};

// Helper to determine badge variant based on status
const getStatusVariant = (status: OrderStatus): "secondary" | "outline" | "default" => {
    switch (status) {
        case 'Received': return 'secondary';
        case 'Pending': return 'outline';
        case 'Done': return 'default'; // Assuming 'default' is visually distinct (e.g., green/blue)
        default: return 'secondary';
    }
};

export default function OrdersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: orders, isLoading, error, refetch } = useQuery<Order[], Error>({
        queryKey: ['orders', { status: statusFilter, searchTerm }],
        queryFn: () => fetchOrders({ status: statusFilter, searchTerm }),
         staleTime: 60 * 1000, // Cache for 1 minute
    });

    const updateStatusMutation = useMutation({
      mutationFn: async ({ orderId, newStatus }: { orderId: string, newStatus: OrderStatus }) => {
          const orderDoc = doc(db, 'orders', orderId);
          await updateDoc(orderDoc, { orderStatus: newStatus });
      },
      onSuccess: (_, variables) => {
          // Optimistic update or invalidate cache
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          // Optionally update specific order details if viewing one
          queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
          toast({ title: "Status Updated", description: `Order ${variables.orderId} status changed to ${variables.newStatus}.` });
      },
      onError: (error: Error, variables) => {
          toast({ variant: "destructive", title: "Error", description: `Failed to update status for order ${variables.orderId}: ${error.message}` });
      },
    });

    const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
         if (ALL_STATUSES.includes(newStatus)) {
             updateStatusMutation.mutate({ orderId, newStatus });
         }
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };


    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Orders</h1>
                 {/* Optional: Add Order button if admins can create orders */}
                 {/* <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Order</Button> */}
            </div>

            <Card>
                 <CardHeader>
                     <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="relative flex-1 w-full sm:w-auto">
                               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                               <Input
                                 type="search"
                                 placeholder="Search by Order ID, Name, Email..."
                                 className="pl-8 w-full sm:w-[300px]"
                                 value={searchTerm}
                                 onChange={handleSearchChange}
                                 disabled={isLoading}
                              />
                          </div>
                          <Select
                               value={statusFilter}
                               onValueChange={(value: OrderStatus | 'all') => setStatusFilter(value)}
                               disabled={isLoading}
                           >
                             <SelectTrigger className="w-full sm:w-[180px]">
                               <SelectValue placeholder="Filter by Status" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="all">All Statuses</SelectItem>
                               {ALL_STATUSES.map(status => (
                                  <SelectItem key={status} value={status}>{status}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                     </div>
                 </CardHeader>
                <CardContent>
                     {isLoading ? (
                         <div className="space-y-4">
                              <Skeleton className="h-12 w-full" />
                              <Skeleton className="h-12 w-full" />
                              <Skeleton className="h-12 w-full" />
                         </div>
                      ) : error ? (
                         <div className="text-center py-10 text-destructive">
                             <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                             <p>Error loading orders: {error.message}</p>
                             <Button onClick={() => refetch()} className="mt-4">Retry</Button>
                         </div>
                      ) : !orders || orders.length === 0 ? (
                         <div className="text-center py-10 text-muted-foreground">
                              <ShoppingBag className="mx-auto h-12 w-12 mb-4" />
                              <p>No orders found.</p>
                              {(searchTerm || statusFilter !== 'all') && <p>Try adjusting your search or filters.</p>}
                          </div>
                      ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-xs">{order.orderId || order.id}</TableCell>
                                        <TableCell className="font-medium">{order.customerName || 'N/A'}</TableCell>
                                        <TableCell>{format(order.timestamp, 'PPp')}</TableCell>
                                        <TableCell>${(order.totalAmount ?? 0).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={order.orderStatus}
                                                onValueChange={(newStatus: OrderStatus) => handleStatusChange(order.id, newStatus)} // Pass Firestore ID
                                                disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === order.id}
                                                >
                                                <SelectTrigger className={`w-[120px] h-8 text-xs border-0 focus:ring-0 shadow-none ${updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === order.id ? 'opacity-50' : ''}`}>
                                                    {/* Display Badge inside Trigger */}
                                                    <SelectValue asChild>
                                                        <Badge variant={getStatusVariant(order.orderStatus)} className="capitalize">
                                                            {order.orderStatus}
                                                         </Badge>
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ALL_STATUSES.map(status => (
                                                        <SelectItem key={status} value={status} className="text-xs">
                                                             <Badge variant={getStatusVariant(status)} className="capitalize mr-2">{status}</Badge>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/orders/${order.id}`} passHref>
                                                 <Button variant="ghost" size="icon">
                                                     <Eye className="h-4 w-4" />
                                                     <span className="sr-only">View Details</span>
                                                 </Button>
                                             </Link>
                                             {/* Optional: Delete Order Button */}
                                             {/* <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button> */}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     )}
                      {/* Add Pagination controls here if needed */}
                </CardContent>
            </Card>
        </div>
    );
}
