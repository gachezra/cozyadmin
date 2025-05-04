'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProductForm from '@/components/products/ProductForm';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Loader2, AlertCircle } from 'lucide-react';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';

const fetchProduct = async (productId: string): Promise<Product | null> => {
    if (!productId) return null;
    const productDocRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productDocRef);
    if (productSnap.exists()) {
        return { id: productSnap.id, ...productSnap.data() } as Product;
    }
    return null;
};

export default function EditProductPage() {
    const params = useParams();
    const productId = params.productId as string;

    const { data: product, isLoading, error, refetch } = useQuery<Product | null, Error>({
        queryKey: ['product', productId],
        queryFn: () => fetchProduct(productId),
        enabled: !!productId, // Only run query if productId exists
    });

    if (isLoading) {
        return (
             <div className="flex items-center justify-center min-h-[400px]">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
             </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-6 text-center text-destructive">
                 <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                 <p>Error loading product: {error.message}</p>
                 <Button onClick={() => refetch()} className="mt-4">Retry</Button>
            </div>
        );
    }

    if (!product) {
         return (
             <div className="container mx-auto py-6 text-center text-muted-foreground">
                 <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                 <p>Product not found.</p>
             </div>
         );
     }

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-6 text-foreground">Edit Product</h1>
            <ProductForm existingProduct={product} />
        </div>
    );
}
