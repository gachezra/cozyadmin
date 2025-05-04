'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Search, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, deleteDoc, doc, query, where, orderBy, startAt, endAt } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Product } from '@/types/product'; // Assuming Product type exists


const fetchProducts = async (searchTerm: string): Promise<Product[]> => {
    const productsCollection = collection(db, 'products');
    let q;

    if (searchTerm) {
        // Basic search: case-insensitive prefix search on 'name'
         q = query(productsCollection,
             orderBy('name'),
             where('name', '>=', searchTerm),
             where('name', '<=', searchTerm + '\uf8ff') // \uf8ff is a high code point character
         );
     } else {
        q = query(productsCollection, orderBy('name')); // Default order by name
    }

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    return products;
};

export default function ProductsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: products, isLoading, error, refetch } = useQuery<Product[], Error>({
        queryKey: ['products', searchTerm], // Include searchTerm in queryKey
        queryFn: () => fetchProducts(searchTerm),
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    const deleteMutation = useMutation({
      mutationFn: async (productId: string) => {
          const productDoc = doc(db, 'products', productId);
          await deleteDoc(productDoc);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate cache after deletion
          toast({ title: "Success", description: "Product deleted successfully." });
      },
      onError: (error: Error) => {
          toast({ variant: "destructive", title: "Error", description: `Failed to delete product: ${error.message}` });
      },
    });

    const handleDelete = (productId: string) => {
        deleteMutation.mutate(productId);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        // Basic debouncing could be added here if needed
        setSearchTerm(event.target.value);
    };

    // Optional: Trigger refetch on search term change if not relying solely on queryKey change
    // React.useEffect(() => {
    //     refetch();
    // }, [searchTerm, refetch]);


    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Products</h1>
                 <Link href="/products/add" passHref>
                     <Button>
                         <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                     </Button>
                 </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                         <div className="relative flex-1">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="search"
                                placeholder="Search products by name..."
                                className="pl-8 w-full sm:w-[300px]"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                disabled={isLoading}
                             />
                         </div>
                         {/* Add Sort/Filter Dropdowns here if needed */}
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
                            <p>Error loading products: {error.message}</p>
                            <Button onClick={() => refetch()} className="mt-4">Retry</Button>
                        </div>
                     ) : !products || products.length === 0 ? (
                         <div className="text-center py-10 text-muted-foreground">
                             <Package className="mx-auto h-12 w-12 mb-4" />
                             <p>No products found.</p>
                             {searchTerm && <p>Try adjusting your search term.</p>}
                         </div>
                     ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                             {product.image ? (
                                                <Image
                                                    src={product.image}
                                                    alt={product.name}
                                                    width={48}
                                                    height={48}
                                                    className="rounded object-cover aspect-square"
                                                    data-ai-hint="product crochet"
                                                />
                                             ) : (
                                                <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
                                                     <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                 </div>
                                             )}
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.category || 'N/A'}</TableCell>
                                        <TableCell>${(product.price ?? 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                             <Link href={`/products/edit/${product.id}`} passHref>
                                                 <Button variant="ghost" size="icon" className="mr-2">
                                                     <Edit className="h-4 w-4" />
                                                     <span className="sr-only">Edit</span>
                                                 </Button>
                                             </Link>
                                             <AlertDialog>
                                                 <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                         <Trash2 className="h-4 w-4" />
                                                         <span className="sr-only">Delete</span>
                                                     </Button>
                                                 </AlertDialogTrigger>
                                                 <AlertDialogContent>
                                                     <AlertDialogHeader>
                                                         <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                         <AlertDialogDescription>
                                                             This action cannot be undone. This will permanently delete the product
                                                             "{product.name}".
                                                         </AlertDialogDescription>
                                                     </AlertDialogHeader>
                                                     <AlertDialogFooter>
                                                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                         <AlertDialogAction
                                                             onClick={() => handleDelete(product.id)}
                                                             className="bg-destructive hover:bg-destructive/90"
                                                             disabled={deleteMutation.isPending}
                                                          >
                                                             {deleteMutation.isPending ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Deleting...
                                                                </>
                                                              ) : "Delete"}
                                                          </AlertDialogAction>
                                                     </AlertDialogFooter>
                                                 </AlertDialogContent>
                                             </AlertDialog>
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
