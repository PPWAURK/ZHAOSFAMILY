"use client";

import { useEffect, useState } from "react";

import { fetchRegisterStores } from "@/features/auth/services/storesApi";

export function useRegisterStores() {
  const [stores, setStores] = useState([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storesError, setStoresError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadStores() {
      try {
        setIsLoadingStores(true);
        setStoresError("");
        const nextStores = await fetchRegisterStores();

        if (isCancelled) {
          return;
        }

        setStores(Array.isArray(nextStores) ? nextStores : []);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStores([]);
        setStoresError(error instanceof Error ? error.message : "Failed to load stores.");
      } finally {
        if (!isCancelled) {
          setIsLoadingStores(false);
        }
      }
    }

    void loadStores();

    return () => {
      isCancelled = true;
    };
  }, []);

  return { stores, isLoadingStores, storesError };
}
