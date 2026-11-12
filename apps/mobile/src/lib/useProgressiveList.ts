import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

export function clampVisibleCount(total: number, initial: number): number {
  return Math.max(0, Math.min(total, initial));
}

export function nextVisibleCount(current: number, total: number, batch: number): number {
  return Math.min(current + batch, total);
}

interface ProgressiveListOptions {
  /** Items rendered on the first frame. */
  initial?: number;
  /** Items added per step after the first frame. */
  batch?: number;
  /** When this value changes (filter, supplier, ...) the list restarts from `initial`. */
  resetKey?: string | number;
}

const DEFAULT_INITIAL = 8;
const DEFAULT_BATCH = 8;

/**
 * Renders a long list in small batches so the first frame and the JS thread stay light.
 * Used for lists that live inside a parent ScrollView, where a nested virtualized list
 * would have no bounded height and render everything anyway.
 * Returns how many items from the head of the list should be rendered.
 */
export function useProgressiveList(
  total: number,
  { initial = DEFAULT_INITIAL, batch = DEFAULT_BATCH, resetKey = 0 }: ProgressiveListOptions = {},
): number {
  const [count, setCount] = useState(() => clampVisibleCount(total, initial));

  // Restart from the first batch when the caller's filter/context changes.
  useEffect(() => {
    setCount(clampVisibleCount(total, initial));
    // total is intentionally not a reset trigger: growing data must not collapse the list.
  }, [resetKey, initial]);

  useEffect(() => {
    if (count >= total) return undefined;

    const handle = InteractionManager.runAfterInteractions(() => {
      setCount((current) => nextVisibleCount(Math.max(current, initial - batch), total, batch));
    });

    return () => handle.cancel();
  }, [count, total, batch]);

  return Math.min(count, total);
}
