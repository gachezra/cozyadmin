'use client';

import React from 'react';
import ProductForm from '@/components/products/ProductForm';

export default function AddProductPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Add New Product</h1>
      <ProductForm />
    </div>
  );
}
