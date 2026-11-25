import type { ExamAttemptQuestion } from "@zhao/types";

import type { ExamCopy } from "../constants/exam-copy";
import styles from "../exams.module.css";
import type { AnswerMap } from "../utils/examAnswers";

type QuestionNavigatorProps = {
  questions: readonly ExamAttemptQuestion[];
  answers: AnswerMap;
  currentIndex: number;
  copy: ExamCopy;
  onSelect: (index: number) => void;
};

/** Numbered grid of the paper: answered questions are filled, the current one outlined. */
export default function QuestionNavigator({
  questions,
  answers,
  currentIndex,
  copy,
  onSelect,
}: QuestionNavigatorProps) {
  return (
    <>
      <nav className={styles.navigator} aria-label={copy.title}>
        {questions.map((question, i) => {
          const isAnswered = Boolean(answers[question.id]?.length);
          const className = [
            styles.navItem,
            isAnswered ? styles.navItemAnswered : "",
            i === currentIndex ? styles.navItemCurrent : "",
          ].join(" ");
          return (
            <button
              key={question.id}
              type="button"
              className={className}
              aria-current={i === currentIndex ? "step" : undefined}
              aria-label={copy.questionStatus(i + 1, isAnswered)}
              onClick={() => onSelect(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>
      <div className={styles.legend} aria-hidden="true">
        <span>
          <i className={`${styles.legendSwatch} ${styles.legendSwatchAnswered}`} />
          {copy.legend.answered}
        </span>
        <span>
          <i className={styles.legendSwatch} />
          {copy.legend.unanswered}
        </span>
        <span>
          <i className={`${styles.legendSwatch} ${styles.legendSwatchCurrent}`} />
          {copy.legend.current}
        </span>
      </div>
    </>
  );
}
