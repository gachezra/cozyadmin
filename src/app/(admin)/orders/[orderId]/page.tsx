'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Order, OrderItem } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, ArrowLeft, Gift } from 'lucide-react';
import { format } from 'date-fns';

type OrderStatus = "Received" | "Pending" | "Done";
const ALL_STATUSES: OrderStatus[] = ["Received", "Pending", "Done"];

const fetchOrder = async (orderId: string): Promise<Order | null> => {
    if (!orderId) return null;
    const orderDocRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderDocRef);
    if (orderSnap.exists()) {
        const data = orderSnap.data();
        return {
            id: orderSnap.id, // Use Firestore doc ID
             ...data,
             timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
             // Ensure items is an array, default to empty if missing/null
             items: Array.isArray(data.items) ? data.items : [],
        } as Order;
    }
    return null;
};

// Helper to determine badge variant based on status
const getStatusVariant = (status: OrderStatus): "secondary" | "outline" | "default" => {
    switch (status) {
        case 'Received': return 'secondary';
        case 'Pending': return 'outline';
        case 'Done': return 'default';
        default: return 'secondary';
    }
};

export default function OrderDetailsPage() {
    const params = useParams();
    const orderId = params.orderId as string;
    const router = useRouter();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: order, isLoading, error, refetch } = useQuery<Order | null, Error>({
        queryKey: ['order', orderId],
        queryFn: () => fetchOrder(orderId),
        enabled: !!orderId,
    });

    const updateStatusMutation = useMutation({
      mutationFn: async ({ newStatus }: { newStatus: OrderStatus }) => {
          if (!order) throw new Error("Order data not available");
          const orderDoc = doc(db, 'orders', order.id); // Use Firestore ID
          await updateDoc(orderDoc, { orderStatus: newStatus });
      },
      onSuccess: (_, variables) => {
          queryClient.invalidateQueries({ queryKey: ['order', orderId] }); // Refetch this order
          queryClient.invalidateQueries({ queryKey: ['orders'] }); // Refetch orders list
          toast({ title: "Status Updated", description: `Order status changed to ${variables.newStatus}.` });
      },
      onError: (error: Error) => {
          toast({ variant: "destructive", title: "Error", description: `Failed to update status: ${error.message}` });
      },
    });

    const handleStatusChange = (newStatus: OrderStatus) => {
         if (ALL_STATUSES.includes(newStatus) && order?.orderStatus !== newStatus) {
             updateStatusMutation.mutate({ newStatus });
         }
    };

     if (isLoading) {
        return (
             <div className="container mx-auto py-6">
                 <Skeleton className="h-8 w-1/4 mb-6" />
                 <div className="grid md:grid-cols-3 gap-6">
                     <div className="md:col-span-2 space-y-6">
                         <Skeleton className="h-48 w-full" />
                         <Skeleton className="h-64 w-full" />
                     </div>
                     <div className="space-y-6">
                          <Skeleton className="h-64 w-full" />
                     </div>
                 </div>
             </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-6 text-center text-destructive">
                 <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                 <p>Error loading order: {error.message}</p>
                 <Button onClick={() => refetch()} className="mt-4">Retry</Button>
            </div>
        );
    }

    if (!order) {
         return (
             <div className="container mx-auto py-6 text-center text-muted-foreground">
                 <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                 <p>Order not found.</p>
                 <Button variant="outline" onClick={() => router.push('/orders')} className="mt-4">
                      <ArrowLeft className="mr-2 h-4 w-4"/> Back to Orders
                 </Button>
             </div>
         );
     }


    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
                 <Button variant="outline" size="icon" onClick={() => router.back()} className="mr-4">
                     <ArrowLeft className="h-4 w-4" />
                     <span className="sr-only">Back</span>
                 </Button>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground flex-1 truncate mr-4">
                     Order Details <span className="font-mono text-lg md:text-xl text-muted-foreground">#{order.orderId || order.id}</span>
                </h1>
                <div className="flex items-center gap-2">
                     <Select
                          value={order.orderStatus}
                          onValueChange={handleStatusChange}
                          disabled={updateStatusMutation.isPending}
                      >
                         <SelectTrigger className="w-[150px]">
                             <SelectValue placeholder="Change Status" />
                         </SelectTrigger>
                         <SelectContent>
                             {ALL_STATUSES.map(status => (
                                 <SelectItem key={status} value={status}>{status}</SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                     {updateStatusMutation.isPending && <Loader2 className="h-5 w-5 animate-spin text-primary"/>}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Left Column (Items) */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                             <CardTitle>Order Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {order.items.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead className="text-center">Quantity</TableHead>
                                            <TableHead className="text-right">Price/Unit</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.items.map((item, index) => (
                                            <TableRow key={item.productId + index}> {/* Add index if productId isn't unique per order */}
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {item.color && <span>Color: {item.color}<br/></span>}
                                                    {item.size && <span>Size: {item.size}</span>}
                                                    {!item.color && !item.size && '-'}
                                                </TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">${(item.pricePerUnit ?? 0).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">${((item.quantity ?? 0) * (item.pricePerUnit ?? 0)).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                 <p className="text-muted-foreground">No items found in this order.</p>
                            )}
                        </CardContent>
                         <CardFooter className="flex justify-between items-center pt-4 border-t">
                             <div className="flex items-center text-sm text-muted-foreground">
                                {order.includesMysteryGift && (
                                    <>
                                         <Gift className="h-4 w-4 mr-2 text-primary" /> Includes Mystery Gift
                                    </>
                                )}
                             </div>
                             <div className="text-right">
                                <p className="text-lg font-semibold">Total: ${(order.totalAmount ?? 0).toFixed(2)}</p>
                             </div>
                         </CardFooter>
                    </Card>
                </div>

                 {/* Right Column (Customer & Status) */}
                 <div className="space-y-6">
                     <Card>
                         <CardHeader>
                             <CardTitle>Order Summary</CardTitle>
                             <CardDescription>Placed on {format(order.timestamp, 'PPPp')}</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-2">
                              <div className="flex justify-between">
                                  <span className="text-muted-foreground">Order ID:</span>
                                  <span className="font-mono text-sm">{order.orderId || order.id}</span>
                              </div>
                               <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge variant={getStatusVariant(order.orderStatus)} className="capitalize">{order.orderStatus}</Badge>
                              </div>
                         </CardContent>
                     </Card>
                     <Card>
                         <CardHeader>
                             <CardTitle>Customer Information</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-2 text-sm">
                             <p><strong>Name:</strong> {order.customerName}</p>
                             <p><strong>Email:</strong> {order.customerEmail}</p>
                             <p><strong>Phone:</strong> {order.customerPhone || 'N/A'}</p>
                             <Separator className="my-3" />
                             <p className="font-medium">Shipping Address:</p>
                             <p className="text-muted-foreground whitespace-pre-line">{order.shippingAddress}</p>
                         </CardContent>
                     </Card>
                 </div>
            </div>
        </div>
    );
}
