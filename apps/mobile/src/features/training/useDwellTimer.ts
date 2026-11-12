import { useEffect, useRef } from "react";

interface DwellTimerOptions {
  enabled: boolean;
  seconds: number;
  resetKey: unknown;
  onReached: () => void;
}

/**
 * Fires `onReached` once after `seconds` of continuous dwell. A single timeout
 * replaces a per-second state update, so the host component re-renders once
 * instead of every second.
 */
export function useDwellTimer({
  enabled,
  seconds,
  resetKey,
  onReached,
}: DwellTimerOptions): void {
  const onReachedRef = useRef(onReached);
  onReachedRef.current = onReached;

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => onReachedRef.current(), seconds * 1000);

    return () => clearTimeout(timer);
  }, [enabled, seconds, resetKey]);
}
