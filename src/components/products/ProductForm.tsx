'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { Product } from '@/types/product';

// Refined Schema for Product
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  price: z.coerce.number().positive('Price must be a positive number'), // Use coerce for string input
  description: z.string().optional(),
  image: z.string().url('Must be a valid URL').optional().or(z.literal('')), // Allow empty string or valid URL
  category: z.string().optional(),
  color: z.array(z.string()).optional().default([]), // Default to empty array
  size: z.array(z.string()).optional().default([]), // Default to empty array
  accent: z.string().optional(),
  // stock_status / quantity can be added here if needed
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  existingProduct?: Product | null;
}

export default function ProductForm({ existingProduct }: ProductFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!existingProduct;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: existingProduct
      ? {
          name: existingProduct.name,
          price: existingProduct.price,
          description: existingProduct.description ?? '',
          image: existingProduct.image ?? '',
          category: existingProduct.category ?? '',
          // Ensure arrays are initialized, even if empty in Firestore
          color: Array.isArray(existingProduct.color) ? existingProduct.color : [],
          size: Array.isArray(existingProduct.size) ? existingProduct.size : [],
          accent: existingProduct.accent ?? '',
        }
      : {
          name: '',
          price: 0,
          description: '',
          image: '',
          category: '',
          color: [],
          size: [],
          accent: '',
        },
  });


  // Handle array inputs (simple comma-separated for now)
  const parseArrayInput = (value: string): string[] => {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  };

  const formatArrayInput = (value: string[]): string => {
    return value.join(', ');
  };


  const mutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const productData = {
           ...data,
           // Ensure arrays are stored correctly
           color: data.color || [],
           size: data.size || [],
      };
      if (isEditMode && existingProduct?.id) {
        const productDoc = doc(db, 'products', existingProduct.id);
        await updateDoc(productDoc, productData);
        return existingProduct.id;
      } else {
        const docRef = await addDoc(collection(db, 'products'), productData);
        return docRef.id;
      }
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate list
      if (isEditMode) {
         queryClient.invalidateQueries({ queryKey: ['product', productId] }); // Invalidate specific product
      }
      toast({
        title: isEditMode ? 'Product Updated' : 'Product Added',
        description: `Product "${form.getValues('name')}" has been successfully ${isEditMode ? 'updated' : 'added'}.`,
      });
      router.push('/products'); // Redirect back to the list
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'add'} product: ${error.message}`,
      });
       setIsSubmitting(false);
    },
  });

  const onSubmit = (data: ProductFormValues) => {
     setIsSubmitting(true);
     // Process array fields before submitting
     const processedData = {
         ...data,
         color: Array.isArray(data.color) ? data.color : parseArrayInput(data.color as any), // Handle potential string input
         size: Array.isArray(data.size) ? data.size : parseArrayInput(data.size as any),   // Handle potential string input
     };
     console.log("Submitting data:", processedData);
     mutation.mutate(processedData);
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cozy Bear Amigurumi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 24.99" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed description of the product..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.jpg" {...field} />
                  </FormControl>
                  <FormDescription>Enter the full URL of the product image.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Amigurumi, Blankets, Hats" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                 control={form.control}
                 name="color"
                 render={({ field }) => (
                     <FormItem>
                         <FormLabel>Colors</FormLabel>
                         <FormControl>
                             {/* We use a hidden input controlled by react-hook-form and a visible input for user entry */}
                             <Input
                                placeholder="e.g., Red, Blue, Green (comma-separated)"
                                value={formatArrayInput(field.value || [])}
                                onChange={(e) => field.onChange(parseArrayInput(e.target.value))}
                             />
                         </FormControl>
                         <FormDescription>Enter available colors, separated by commas.</FormDescription>
                         <FormMessage />
                     </FormItem>
                 )}
             />
            <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Sizes</FormLabel>
                        <FormControl>
                             <Input
                                placeholder="e.g., Small, Medium, Large (comma-separated)"
                                value={formatArrayInput(field.value || [])}
                                onChange={(e) => field.onChange(parseArrayInput(e.target.value))}
                            />
                        </FormControl>
                        <FormDescription>Enter available sizes, separated by commas.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
              control={form.control}
              name="accent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accent</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bow, Safety Eyes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? 'Update Product' : 'Add Product'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
