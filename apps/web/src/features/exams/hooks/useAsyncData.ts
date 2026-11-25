"use client";

import { useCallback, useEffect, useState } from "react";

export type AsyncData<T> = {
  data: T | null;
  isLoading: boolean;
  error: unknown;
  reload: () => void;
};

/** Loads data on mount and whenever `deps` change; ignores stale responses. */
export function useAsyncData<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  isEnabled = true,
): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(isEnabled);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!isEnabled) {
      setIsLoading(false);
      return undefined;
    }
    let isActive = true;
    setIsLoading(true);
    setError(null);
    load()
      .then((result) => {
        if (isActive) setData(result);
      })
      .catch((reason: unknown) => {
        if (isActive) setError(reason);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [...deps, version, isEnabled]);

  return { data, isLoading, error, reload };
}
