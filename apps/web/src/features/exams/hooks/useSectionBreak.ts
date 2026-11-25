"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExamAttempt } from "@zhao/types";

import { fetchExamAttempt, startExamSection } from "../services/examApi";
import { remainingMs } from "../utils/examTimer";
import { useInterval } from "./useInterval";

/** While the break is over but the server has not opened the section yet, ask again this often. */
export const BREAK_POLL_MS = 3_000;

export type SectionBreak = {
  isOnBreak: boolean;
  /** Time left in the break (server clock), null outside a break. */
  breakRemaining: number | null;
  isStarting: boolean;
  error: unknown;
  /** Ends the break early: the next section's clock starts now. */
  startNextSection: () => Promise<void>;
};

type SectionBreakOptions = {
  attempt: ExamAttempt | null;
  clockOffset: number;
  now: number;
  /** Receives the refreshed attempt (questions of the next section, or a graded paper). */
  onAttempt: (attempt: ExamAttempt) => void;
};

/**
 * The break between two sections of a sectioned paper: countdown to
 * `breakEndsAt`, a refetch once it has passed (the server then returns the
 * next section's questions), and starting the next section early.
 */
export function useSectionBreak({
  attempt,
  clockOffset,
  now,
  onAttempt,
}: SectionBreakOptions): SectionBreak {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const isRefreshing = useRef(false);
  // `?? null`: tolerate payloads without the field (single-section papers).
  const breakEndsAt = attempt?.status === "IN_PROGRESS" ? (attempt.breakEndsAt ?? null) : null;
  const breakRemaining = remainingMs(breakEndsAt, clockOffset, now);
  const isBreakOver = breakRemaining === 0;
  const attemptId = attempt?.id ?? null;

  const refresh = useCallback(() => {
    if (attemptId === null || isRefreshing.current) return;
    isRefreshing.current = true;
    fetchExamAttempt(attemptId)
      .then((next) => {
        setError(null);
        onAttempt(next);
      })
      // Shown on the break screen; the poll below keeps retrying.
      .catch((reason: unknown) => setError(reason))
      .finally(() => {
        isRefreshing.current = false;
      });
  }, [attemptId, onAttempt]);

  useEffect(() => {
    if (isBreakOver) refresh();
  }, [isBreakOver, refresh]);
  useInterval(refresh, isBreakOver ? BREAK_POLL_MS : null);

  const startNextSection = useCallback(async () => {
    if (!attempt || !breakEndsAt || isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      onAttempt(await startExamSection(attempt.id, attempt.sectionIndex));
    } catch (reason) {
      setError(reason);
    } finally {
      setIsStarting(false);
    }
  }, [attempt, breakEndsAt, isStarting, onAttempt]);

  return {
    isOnBreak: breakEndsAt !== null,
    breakRemaining,
    isStarting,
    error,
    startNextSection,
  };
}
