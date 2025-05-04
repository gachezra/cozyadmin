'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2, X, Upload, Trash2 } from 'lucide-react';
import { Product } from '@/types/product';
import axios from 'axios';
import Image from 'next/image'; // Import next/image
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// ---- Environment Variables ----
// Ensure these are set in your .env.local file
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dykwdjdaf'; // Replace with your default or throw error
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'events'; // Replace with your default or throw error

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.error("Cloudinary environment variables (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) are not set!");
  // Depending on your error handling strategy, you might want to throw an error here
  // throw new Error("Cloudinary configuration missing.");
}
// -----------------------------


// Refined Schema for Product
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
  description: z.string().optional(),
  image: z.string().url('Image must be a valid URL').optional().or(z.literal('')), // Can be empty string
  category: z.string().optional(),
  color: z.array(z.string()).optional().default([]),
  size: z.array(z.string()).optional().default([]),
  accent: z.string().optional(),
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
  const [isUploading, setIsUploading] = useState(false); // State for image upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingProduct?.image || null); // For image preview
  const isEditMode = !!existingProduct;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: existingProduct
      ? {
          name: existingProduct.name,
          price: existingProduct.price,
          description: existingProduct.description ?? '',
          image: existingProduct.image ?? '', // Keep existing image URL initially
          category: existingProduct.category ?? '',
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

   // Effect to update preview when file is selected
   useEffect(() => {
     if (selectedFile) {
       const objectUrl = URL.createObjectURL(selectedFile);
       setPreviewUrl(objectUrl);

       // Clean up the object URL when the component unmounts or file changes
       return () => URL.revokeObjectURL(objectUrl);
     }
     // If file is removed, reset preview to existing image (if any) or null
     setPreviewUrl(existingProduct?.image || null);
   }, [selectedFile, existingProduct?.image]);


  // Handle array inputs (improved parsing)
  const parseArrayInput = (value: string): string[] => {
    if (!value || typeof value !== 'string') return [];
    return value.split(',')
                .map(item => item.trim()) // Trim whitespace
                .filter(item => item.length > 0); // Remove empty strings
  };

  const formatArrayInput = (value: string[] | undefined): string => {
    if (!Array.isArray(value)) return '';
    return value.join(', ');
  };

  // Function to handle image removal
  const handleRemoveImage = () => {
      setSelectedFile(null);
      setPreviewUrl(null);
      form.setValue('image', ''); // Clear the image URL in the form state
  };

  const mutation = useMutation({
    mutationFn: async (data: ProductFormValues & { imageUrl?: string }) => {
      // Use the passed imageUrl if available (from upload), otherwise use form data
      const finalImageUrl = data.imageUrl !== undefined ? data.imageUrl : data.image;

       const productData = {
           ...data,
           image: finalImageUrl, // Use the final URL
           color: Array.isArray(data.color) ? data.color : parseArrayInput(data.color as any),
           size: Array.isArray(data.size) ? data.size : parseArrayInput(data.size as any),
       };
       // Remove the temporary imageUrl prop if it exists
       delete (productData as any).imageUrl;

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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (isEditMode) {
         queryClient.invalidateQueries({ queryKey: ['product', productId] });
      }
      toast({
        title: isEditMode ? 'Product Updated' : 'Product Added',
        description: `Product "${form.getValues('name')}" has been successfully ${isEditMode ? 'updated' : 'added'}.`,
      });
      router.push('/products');
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'add'} product: ${error.message}`,
      });
      setIsSubmitting(false);
      setIsUploading(false); // Ensure upload state is reset on error
    },
     // Make sure submitting state is reset regardless of success/error
     onSettled: () => {
         setIsSubmitting(false);
         setIsUploading(false);
     }
  });


  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    let finalImageUrl = data.image; // Start with the current image URL (could be existing or empty)

    // --- Image Upload Logic ---
    if (selectedFile) {
       setIsUploading(true);
       const formData = new FormData();
       formData.append('file', selectedFile);
       formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

       try {
         const response = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, formData);
         finalImageUrl = response.data.secure_url; // Get the uploaded image URL
         console.log("Image uploaded successfully:", finalImageUrl);
         setIsUploading(false); // Upload finished before DB mutation
       } catch (error) {
         console.error('Error uploading image:', error);
         toast({
           variant: 'destructive',
           title: 'Image Upload Failed',
           description: 'Could not upload the selected image. Please try again.',
         });
         setIsUploading(false);
         setIsSubmitting(false); // Stop the whole submission process
         return; // Exit onSubmit if upload fails
       }
    } else if (!finalImageUrl && isEditMode && existingProduct?.image) {
       // If no new file is selected AND the existing URL was cleared (by handleRemoveImage)
       // Ensure the final URL is indeed empty for the update.
       // This case is handled implicitly because finalImageUrl remains ''
    }
    // --- End Image Upload Logic ---


    // Process array fields *before* submitting to mutation
    const processedData = {
         ...data,
         color: Array.isArray(data.color) ? data.color : parseArrayInput(data.color as any),
         size: Array.isArray(data.size) ? data.size : parseArrayInput(data.size as any),
         imageUrl: finalImageUrl, // Pass the final URL to the mutation
    };
    console.log("Submitting data to mutation:", processedData);
    mutation.mutate(processedData);
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            {/* Product Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cozy Bear Amigurumi" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 24.99" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed description of the product..." {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
             <FormItem>
               <FormLabel>Product Image</FormLabel>
               <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border rounded-md overflow-hidden flex items-center justify-center bg-muted flex-shrink-0">
                      {isUploading ? (
                         <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : previewUrl ? (
                         <Image
                           src={previewUrl}
                           alt="Product Preview"
                           width={96}
                           height={96}
                           className="object-cover w-full h-full"
                         />
                      ) : (
                        <Skeleton className="w-full h-full" /> // Placeholder when no image
                      )}
                   </div>
                 <div className="flex-grow space-y-2">
                   <FormControl>
                      <Input
                          type="file"
                          accept="image/*" // Accept only image files
                          onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                  setSelectedFile(file);
                                  // Don't set form value here, handle URL after upload
                              } else {
                                  setSelectedFile(null);
                              }
                          }}
                          disabled={isSubmitting || isUploading}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                   </FormControl>
                   <FormDescription>Upload a new image (max 2MB recommended).</FormDescription>
                    {previewUrl && !isUploading && (
                        <Button
                           type="button"
                           variant="destructive"
                           size="sm"
                           onClick={handleRemoveImage}
                           disabled={isSubmitting}
                         >
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Image
                        </Button>
                    )}
                 </div>
               </div>
               {/* Hidden input to store the final image URL */}
                <FormField
                   control={form.control}
                   name="image"
                   render={({ field }) => <Input type="hidden" {...field} />}
                />
               <FormMessage /> {/* Display errors related to the 'image' field if any (e.g., URL validation) */}
             </FormItem>


             {/* Category */}
             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Amigurumi, Blankets, Hats" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Colors */}
             <FormField
                 control={form.control}
                 name="color"
                 render={({ field }) => (
                     <FormItem>
                         <FormLabel>Colors</FormLabel>
                         <FormControl>
                             {/* Controller handles array transformation implicitly */}
                             <Input
                                placeholder="e.g., Red, Blue, Green"
                                value={formatArrayInput(field.value)}
                                onChange={(e) => field.onChange(parseArrayInput(e.target.value))}
                                disabled={isSubmitting}
                             />
                         </FormControl>
                         <FormDescription>Enter available colors, separated by commas.</FormDescription>
                         <FormMessage />
                     </FormItem>
                 )}
             />

            {/* Sizes */}
            <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Sizes</FormLabel>
                        <FormControl>
                             <Input
                                placeholder="e.g., Small, Medium, Large"
                                value={formatArrayInput(field.value)}
                                onChange={(e) => field.onChange(parseArrayInput(e.target.value))}
                                disabled={isSubmitting}
                            />
                        </FormControl>
                        <FormDescription>Enter available sizes, separated by commas.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

             {/* Accent */}
             <FormField
              control={form.control}
              name="accent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accent</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bow, Safety Eyes" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting || isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
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
