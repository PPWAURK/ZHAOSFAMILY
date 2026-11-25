import { useCallback, useEffect, useState } from "react";
import type { ExamAttempt } from "@zhao/types";
import { examRemainingMs, isTransientRequestError } from "@zhao/utils";

import { startExamSection } from "@/features/exams/examApi";
import { isExamOnBreak } from "@/features/exams/examSectionState";

/** While the break is over but the server has not handed out the questions yet. */
export const BREAK_RESYNC_MS = 5_000;

type ExamBreakParams = {
  attempt: ExamAttempt | null;
  clockOffset: number;
  now: number;
  applyAttempt: (attempt: ExamAttempt) => void;
  resync: () => Promise<void>;
};

export type ExamBreakState = {
  isOnBreak: boolean;
  /** Milliseconds until the next section starts by itself; null when not on a break. */
  breakRemaining: number | null;
  isStartingSection: boolean;
  startError: unknown;
  startNextSection: () => Promise<void>;
};

type StartFailure = { sectionIndex: number; error: unknown };

/**
 * The break between two sections: a countdown to `breakEndsAt`, a refetch
 * once it is over (repeated until the next section's questions arrive), and
 * an early start of the next section.
 */
export function useExamBreak({
  attempt,
  clockOffset,
  now,
  applyAttempt,
  resync,
}: ExamBreakParams): ExamBreakState {
  const [isStartingSection, setIsStartingSection] = useState(false);
  const [startFailure, setStartFailure] = useState<StartFailure | null>(null);
  const isOnBreak = attempt ? isExamOnBreak(attempt) : false;
  const breakRemaining =
    attempt && isOnBreak ? examRemainingMs(attempt.breakEndsAt, clockOffset, now) : null;
  const isBreakOver = breakRemaining === 0;

  useEffect(() => {
    if (!isBreakOver) return undefined;
    void resync();
    const timer = setInterval(() => void resync(), BREAK_RESYNC_MS);
    return () => clearInterval(timer);
  }, [isBreakOver, resync]);

  const startNextSection = useCallback(async () => {
    if (!attempt || !isOnBreak || isStartingSection) return;
    setIsStartingSection(true);
    setStartFailure(null);
    try {
      applyAttempt(await startExamSection(attempt.id, attempt.sectionIndex));
    } catch (error) {
      setStartFailure({ sectionIndex: attempt.sectionIndex, error });
      // A refused start (section already running, break already over): resync.
      if (!isTransientRequestError(error)) void resync();
    } finally {
      setIsStartingSection(false);
    }
  }, [attempt, isOnBreak, isStartingSection, applyAttempt, resync]);

  const startError =
    startFailure && startFailure.sectionIndex === attempt?.sectionIndex ? startFailure.error : null;

  return { isOnBreak, breakRemaining, isStartingSection, startError, startNextSection };
}
