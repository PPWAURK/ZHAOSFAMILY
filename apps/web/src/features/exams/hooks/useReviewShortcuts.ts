"use client";

import { useEffect } from "react";

type ReviewShortcuts = {
  isEnabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onApprove: () => void;
  onReject: () => void;
};

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** J/K move between questions, A approves and R rejects the focused one. */
export function useReviewShortcuts({
  isEnabled,
  onNext,
  onPrevious,
  onApprove,
  onReject,
}: ReviewShortcuts): void {
  useEffect(() => {
    if (!isEnabled || typeof window === "undefined") return undefined;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target && TYPING_TAGS.has(target.tagName))
      )
        return;
      const actions: Record<string, () => void> = {
        j: onNext,
        k: onPrevious,
        a: onApprove,
        r: onReject,
      };
      const action = actions[event.key.toLowerCase()];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isEnabled, onNext, onPrevious, onApprove, onReject]);
}
