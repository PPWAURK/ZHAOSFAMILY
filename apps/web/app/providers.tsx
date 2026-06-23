"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ConfirmProvider } from "@/shared/components/confirm/ConfirmProvider";
import { ToastProvider } from "@/shared/components/toast/ToastProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <ToastProvider>{children}</ToastProvider>
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
