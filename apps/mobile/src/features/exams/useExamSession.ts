import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { ExamAttempt, ExamQuestionType } from "@zhao/types";
import {
  computeExamClockOffset,
  examRemainingMs,
  isTransientRequestError,
  toExamAnswerList,
  toggleExamAnswer,
  type ExamAnswerMap,
} from "@zhao/utils";

import { fetchExamAttempt, saveExamAnswers, submitExamAttempt } from "@/features/exams/examApi";
import {
  isExamOnBreak,
  isStaleSectionError,
  mergeExamAnswers,
  submitSectionIndex,
} from "@/features/exams/examSectionState";
import { useExamBreak, type ExamBreakState } from "@/features/exams/useExamBreak";

export const AUTOSAVE_MS = 30_000;
export const SUBMIT_RETRY_MS = 5_000;
const TICK_MS = 1_000;

export type ExamSession = ExamBreakState & {
  attempt: ExamAttempt | null;
  loadError: unknown;
  /** Failed refetch while waiting for the next section (retried automatically). */
  syncError: unknown;
  answers: ExamAnswerMap;
  remaining: number | null;
  savedAt: string | null;
  isSubmitting: boolean;
  submitError: unknown;
  select: (questionId: number, type: ExamQuestionType, key: string) => void;
  submit: () => Promise<ExamAttempt | null>;
  reload: () => void;
};

/**
 * Holds an in-progress attempt on the phone: answers, a server-synced
 * countdown, autosave every 30s and whenever the app goes to the background,
 * and a single submission per section — triggered automatically when time
 * runs out. Sectioned papers go through a break between sections.
 */
export function useExamSession(
  attemptId: number,
  onFinished: (attempt: ExamAttempt) => void,
): ExamSession {
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [syncError, setSyncError] = useState<unknown>(null);
  const [answers, setAnswers] = useState<ExamAnswerMap>({});
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const isDirty = useRef(false);
  const hasSubmitted = useRef(false);
  const isSyncing = useRef(false);
  const autoSubmittedSection = useRef<number | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  /** Adopts a server state: graded papers leave, in-progress ones replace the attempt. */
  const applyAttempt = useCallback(
    (loaded: ExamAttempt) => {
      if (loaded.status !== "IN_PROGRESS") return onFinished(loaded);
      setClockOffset(computeExamClockOffset(loaded.serverNow, Date.now()));
      setNow(Date.now());
      setAnswers((current) => mergeExamAnswers(loaded.answers, current));
      setAttempt(loaded);
    },
    [onFinished],
  );

  useEffect(() => {
    let isActive = true;
    setLoadError(null);
    fetchExamAttempt(attemptId)
      .then((loaded) => {
        if (isActive) applyAttempt(loaded);
      })
      .catch((reason: unknown) => {
        if (isActive) setLoadError(reason);
      });
    return () => {
      isActive = false;
    };
  }, [attemptId, applyAttempt, version]);

  const resync = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      applyAttempt(await fetchExamAttempt(attemptId));
      setSyncError(null);
    } catch (reason) {
      setSyncError(reason);
    } finally {
      isSyncing.current = false;
    }
  }, [attemptId, applyAttempt]);

  const saveNow = useCallback(() => {
    if (!attempt || !isDirty.current || hasSubmitted.current) return;
    isDirty.current = false;
    saveExamAnswers(attempt.id, toExamAnswerList(answersRef.current))
      .then((result) => setSavedAt(result.savedAt))
      .catch(() => {
        isDirty.current = true;
      });
  }, [attempt]);

  useEffect(() => {
    if (!attempt) return undefined;
    const isOnBreak = isExamOnBreak(attempt);
    const autosave = setInterval(saveNow, AUTOSAVE_MS);
    const isTimed = Boolean(attempt.deadlineAt || attempt.breakEndsAt);
    const tick = isTimed ? setInterval(() => setNow(Date.now()), TICK_MS) : null;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return saveNow();
      setNow(Date.now());
      // The break may have ended while the phone was locked.
      if (isOnBreak) void resync();
    });
    return () => {
      clearInterval(autosave);
      if (tick) clearInterval(tick);
      subscription.remove();
    };
  }, [attempt, saveNow, resync]);

  const submit = useCallback(async (): Promise<ExamAttempt | null> => {
    if (hasSubmitted.current || !attempt || isExamOnBreak(attempt)) return null;
    hasSubmitted.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const next = await submitExamAttempt(
        attempt.id,
        toExamAnswerList(answersRef.current),
        submitSectionIndex(attempt),
      );
      isDirty.current = false;
      // A handed-in non-last section (or a repeated submit) returns the
      // attempt still in progress: on the break, or already further on.
      hasSubmitted.current = next.status !== "IN_PROGRESS";
      applyAttempt(next);
      return next;
    } catch (reason) {
      hasSubmitted.current = false;
      if (isStaleSectionError(reason)) void resync();
      else setSubmitError(reason);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, applyAttempt, resync]);

  const breakState = useExamBreak({ attempt, clockOffset, now, applyAttempt, resync });
  const remaining = attempt ? examRemainingMs(attempt.deadlineAt, clockOffset, now) : null;

  // At time-up submit the section once; retry transient failures (network, 5xx), never 4xx.
  useEffect(() => {
    if (remaining !== 0 || !attempt || breakState.isOnBreak) return undefined;
    if (submitError) {
      if (!isTransientRequestError(submitError)) return undefined;
      const timer = setTimeout(() => void submit(), SUBMIT_RETRY_MS);
      return () => clearTimeout(timer);
    }
    if (autoSubmittedSection.current === attempt.sectionIndex) return undefined;
    autoSubmittedSection.current = attempt.sectionIndex;
    void submit();
    return undefined;
  }, [remaining, attempt, breakState.isOnBreak, submit, submitError]);

  const select = useCallback((questionId: number, type: ExamQuestionType, key: string) => {
    isDirty.current = true;
    setAnswers((current) => toggleExamAnswer(current, questionId, type, key));
  }, []);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    ...breakState,
    attempt,
    loadError,
    syncError,
    answers,
    remaining,
    savedAt,
    isSubmitting,
    submitError,
    select,
    submit,
    reload,
  };
}
