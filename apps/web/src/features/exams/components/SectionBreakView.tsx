import type { ExamAttempt } from "@zhao/types";

import type { ExamCopy } from "../constants/exam-copy";
import { pickText, type ExamContentLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import { formatCountdown } from "../utils/examTimer";

type SectionBreakViewProps = {
  attempt: ExamAttempt;
  copy: ExamCopy;
  language: ExamContentLanguage;
  breakRemaining: number | null;
  isStarting: boolean;
  error: string | null;
  onStart: () => void;
};

/**
 * Between two sections: the handed-in section is closed, a countdown runs to
 * `breakEndsAt`, and the employee may start the next section early.
 */
export default function SectionBreakView({
  attempt,
  copy,
  language,
  breakRemaining,
  isStarting,
  error,
  onStart,
}: SectionBreakViewProps) {
  const labels = copy.section;
  const next = attempt.sections?.[attempt.sectionIndex];
  const isOver = breakRemaining === 0;

  return (
    <section className={planStyles.breakPanel} aria-live="polite">
      <h2>{labels.breakTitle}</h2>
      <p className={styles.notice}>{labels.handedIn(attempt.sectionIndex)}</p>
      {breakRemaining !== null ? (
        <p>
          <span className={styles.muted}>{labels.breakLeft}</span>
          <br />
          <span className={planStyles.breakCountdown} role="timer">
            {formatCountdown(breakRemaining)}
          </span>
        </p>
      ) : null}
      {next ? (
        <p>
          <strong>{labels.next(pickText(language, next.titleZh, next.titleFr))}</strong>
          <br />
          <span className={styles.muted}>
            {copy.questions(next.questionCount)} · {copy.timeLimit(next.timeLimitMinutes)}
          </span>
        </p>
      ) : null}
      <p className={styles.muted}>{isOver ? labels.loadingNext : labels.breakHint}</p>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button
        type="button"
        className={styles.buttonPrimary}
        disabled={isStarting || isOver}
        onClick={onStart}
      >
        {isStarting ? labels.starting : labels.startNext}
      </button>
    </section>
  );
}
