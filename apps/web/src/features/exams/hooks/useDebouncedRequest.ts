"use client";

import { useEffect, useRef, useState } from "react";

export const DEBOUNCE_MS = 400;

export type DebouncedRequest<T> = {
  data: T | null;
  error: unknown;
  isPending: boolean;
};

/**
 * Runs `request` `delayMs` after `key` stops changing (null request: idle,
 * clears the data). Stale responses are ignored; the latest request function
 * is used, so callers can pass inline closures.
 */
export function useDebouncedRequest<T>(
  request: (() => Promise<T>) | null,
  key: string,
  delayMs = DEBOUNCE_MS,
): DebouncedRequest<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isPending, setIsPending] = useState(false);
  const latest = useRef(request);
  const isEnabled = request !== null;

  useEffect(() => {
    latest.current = request;
  }, [request]);

  useEffect(() => {
    if (!isEnabled) {
      setData(null);
      setError(null);
      setIsPending(false);
      return undefined;
    }
    let isActive = true;
    setIsPending(true);
    const timer = setTimeout(() => {
      const run = latest.current;
      if (!run) return;
      run()
        .then((result) => {
          if (!isActive) return;
          setData(result);
          setError(null);
        })
        .catch((reason: unknown) => {
          if (!isActive) return;
          setData(null);
          setError(reason);
        })
        .finally(() => {
          if (isActive) setIsPending(false);
        });
    }, delayMs);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [key, isEnabled, delayMs]);

  return { data, error, isPending };
}
