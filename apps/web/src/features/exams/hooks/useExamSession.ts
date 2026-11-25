"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExamAttempt, ExamQuestionType } from "@zhao/types";
import { isTransientRequestError as isTransientError } from "@zhao/utils";

import { fetchExamAttempt, saveExamAnswers, submitExamAttempt } from "../services/examApi";
import { toAnswerList, toAnswerMap, toggleAnswer, type AnswerMap } from "../utils/examAnswers";
import { computeClockOffset, remainingMs } from "../utils/examTimer";
import { useInterval } from "./useInterval";
import { useSectionBreak, type SectionBreak } from "./useSectionBreak";

export const AUTOSAVE_MS = 30_000;
const TICK_MS = 1_000;
export const SUBMIT_RETRY_MS = 5_000;

export { isTransientRequestError as isTransientError } from "@zhao/utils";

export type ExamSession = {
  attempt: ExamAttempt | null;
  loadError: unknown;
  answers: AnswerMap;
  remaining: number | null;
  savedAt: string | null;
  isSubmitting: boolean;
  submitError: unknown;
  select: (questionId: number, type: ExamQuestionType, key: string) => void;
  submit: () => Promise<ExamAttempt | null>;
  /** Sectioned papers: the break between two sections. */
  sectionBreak: SectionBreak;
};

/**
 * Holds an in-progress attempt: answers, a server-synced countdown, autosave
 * at most every 30s (the API is rate-limited per IP, shared by a whole store),
 * and a single submission — triggered automatically when time runs out.
 * Sectioned papers hand in one section at a time (the response is the attempt
 * on its break, still IN_PROGRESS); each section gets its own submission.
 */
export function useExamSession(
  attemptId: number,
  onFinished: (attempt: ExamAttempt) => void,
): ExamSession {
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isDirty = useRef(false);
  const hasSubmitted = useRef(false);

  /** Graded papers leave the page; in-progress ones (next section, break) replace the state. */
  const applyAttempt = useCallback(
    (next: ExamAttempt) => {
      if (next.status !== "IN_PROGRESS") {
        onFinished(next);
        return;
      }
      setClockOffset(computeClockOffset(next.serverNow, Date.now()));
      setAttempt(next);
    },
    [onFinished],
  );

  useEffect(() => {
    let isActive = true;
    fetchExamAttempt(attemptId)
      .then((loaded) => {
        if (!isActive) return;
        if (loaded.status === "IN_PROGRESS") setAnswers(toAnswerMap(loaded.answers));
        applyAttempt(loaded);
      })
      .catch((reason: unknown) => isActive && setLoadError(reason));
    return () => {
      isActive = false;
    };
  }, [attemptId, applyAttempt]);

  const sectionBreak = useSectionBreak({ attempt, clockOffset, now, onAttempt: applyAttempt });
  const isOnBreak = sectionBreak.isOnBreak;
  // During a break `deadlineAt` is already the next section's: no time-up yet.
  const remaining =
    attempt && !isOnBreak ? remainingMs(attempt.deadlineAt, clockOffset, now) : null;
  const isTicking = Boolean(attempt?.deadlineAt || attempt?.breakEndsAt);
  useInterval(() => setNow(Date.now()), isTicking ? TICK_MS : null);

  const submit = useCallback(async (): Promise<ExamAttempt | null> => {
    if (hasSubmitted.current || !attempt || isOnBreak) return null;
    hasSubmitted.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const list = toAnswerList(answers);
      const next = attempt.sections
        ? await submitExamAttempt(attempt.id, list, attempt.sectionIndex)
        : await submitExamAttempt(attempt.id, list);
      isDirty.current = false;
      // A handed-in section starts the break: the next section is submitted on its own.
      if (next.status === "IN_PROGRESS") hasSubmitted.current = false;
      applyAttempt(next);
      return next;
    } catch (reason) {
      hasSubmitted.current = false;
      setSubmitError(reason);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, answers, isOnBreak, applyAttempt]);

  // At time-up submit once; if that fails for a transient reason (network,
  // 5xx), retry every few seconds instead of silently waiting for the server
  // to grade the last autosave. Client errors (4xx) are final.
  useEffect(() => {
    if (remaining !== 0) return undefined;
    if (!submitError) {
      void submit();
      return undefined;
    }
    if (!isTransientError(submitError)) return undefined;
    const timer = setTimeout(() => void submit(), SUBMIT_RETRY_MS);
    return () => clearTimeout(timer);
  }, [remaining, submit, submitError]);

  useInterval(
    () => {
      if (!attempt || isOnBreak || !isDirty.current || hasSubmitted.current) return;
      isDirty.current = false;
      saveExamAnswers(attempt.id, toAnswerList(answers))
        .then((result) => setSavedAt(result.savedAt))
        .catch(() => {
          isDirty.current = true;
        });
    },
    attempt ? AUTOSAVE_MS : null,
  );

  useEffect(() => {
    if (!attempt || typeof window === "undefined") return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty.current || hasSubmitted.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [attempt]);

  const select = useCallback((questionId: number, type: ExamQuestionType, key: string) => {
    isDirty.current = true;
    setAnswers((current) => toggleAnswer(current, questionId, type, key));
  }, []);

  return {
    attempt,
    loadError,
    answers,
    remaining,
    savedAt,
    isSubmitting,
    submitError,
    select,
    submit,
    sectionBreak,
  };
}
