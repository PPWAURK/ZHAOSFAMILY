"use client";

import { useEffect, useRef } from "react";

import type { ExamCopy } from "../constants/exam-copy";
import styles from "../exams.module.css";
import { formatCountdown } from "../utils/examTimer";

type SubmitReviewModalProps = {
  copy: ExamCopy;
  total: number;
  /** 1-based numbers of the questions without an answer. */
  unansweredNumbers: readonly number[];
  remainingMs: number | null;
  isSubmitting: boolean;
  error: string | null;
  /** Sectioned papers, before the last section: the section cannot be reopened. */
  sectionNotice?: string | null;
  confirmLabel?: string;
  onJump: (questionNumber: number) => void;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Last check before submitting: how many questions are answered, which ones
 * are still empty (each a shortcut back to it) and the time left.
 */
export default function SubmitReviewModal({
  copy,
  total,
  unansweredNumbers,
  remainingMs,
  isSubmitting,
  error,
  sectionNotice = null,
  confirmLabel,
  onJump,
  onConfirm,
  onClose,
}: SubmitReviewModalProps) {
  const labels = copy.review;
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const answeredCount = total - unansweredNumbers.length;

  useEffect(() => {
    confirmRef.current?.focus?.();
  }, []);

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-submit-review-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSubmitting) onClose();
      }}
    >
      <div className={`${styles.modal} ${styles.submitModal}`}>
        <h2 id="exam-submit-review-title">{labels.title}</h2>
        <div className={styles.submitStats}>
          <div className={styles.metric}>
            <span>{labels.answered}</span>
            <strong>
              {answeredCount} / {total}
            </strong>
          </div>
          <div className={styles.metric}>
            <span>{labels.unanswered}</span>
            <strong className={unansweredNumbers.length ? styles.textUrgent : undefined}>
              {unansweredNumbers.length}
            </strong>
          </div>
          {remainingMs !== null ? (
            <div className={styles.metric}>
              <span>{labels.timeLeft}</span>
              <strong>{formatCountdown(remainingMs)}</strong>
            </div>
          ) : null}
        </div>

        {unansweredNumbers.length ? (
          <>
            <p className={styles.notice}>{labels.unansweredHint}</p>
            <div className={styles.navigator}>
              {unansweredNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={styles.navItem}
                  aria-label={labels.jumpTo(n)}
                  disabled={isSubmitting}
                  onClick={() => onJump(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.notice}>{labels.allAnswered}</p>
        )}

        {sectionNotice ? <p className={styles.notice}>{sectionNotice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.submitActions}>
          <button type="button" className={styles.button} disabled={isSubmitting} onClick={onClose}>
            {labels.back}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={styles.buttonPrimary}
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? copy.submitting : (confirmLabel ?? labels.confirm)}
          </button>
        </div>
      </div>
    </div>
  );
}
