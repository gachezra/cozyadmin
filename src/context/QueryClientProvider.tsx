"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Optional: If you want React Query DevTools
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Create a client
// It's often recommended to create the client outside the component
// to prevent it from being recreated on every render.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Optional: disable refetch on window focus
    },
  },
});

export function QueryClientProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Optional: Add React Query DevTools for debugging */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}
