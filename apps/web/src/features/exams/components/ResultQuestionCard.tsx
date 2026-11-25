import type { ExamAttemptResultItem } from "@zhao/types";

import type { ExamCopy } from "../constants/exam-copy";
import { pickText, type ExamContentLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import StatusBadge from "./StatusBadge";

type ResultQuestionCardProps = {
  item: ExamAttemptResultItem;
  index: number;
  language: ExamContentLanguage;
  copy: ExamCopy;
  showDetails: boolean;
};

function optionClass(key: string, item: ExamAttemptResultItem, showDetails: boolean): string {
  if (showDetails && item.correctKeys.includes(key)) return styles.optionCorrect;
  if (!item.selectedKeys.includes(key)) return styles.option;
  return showDetails ? styles.optionWrong : styles.optionSelected;
}

/** One graded question: the user's choice, and (when published) the right answer and explanation. */
export default function ResultQuestionCard({
  item,
  index,
  language,
  copy,
  showDetails,
}: ResultQuestionCardProps) {
  const explanation = pickText(language, item.explanationZh, item.explanationFr);
  return (
    <article className={styles.question}>
      <div className={styles.questionHeader}>
        <span>#{index + 1}</span>
        <span className={styles.badge}>{copy.types[item.type]}</span>
        <StatusBadge tone={item.isCorrect ? "ok" : "bad"} label={item.isCorrect ? "✓" : "✗"} />
      </div>
      <p className={styles.prompt}>{pickText(language, item.promptZh, item.promptFr)}</p>
      <ul className={styles.options}>
        {item.options.map((option) => (
          <li key={option.key} className={optionClass(option.key, item, showDetails)}>
            <span>{pickText(language, option.zh, option.fr)}</span>
          </li>
        ))}
      </ul>
      {!item.selectedKeys.length ? <p className={styles.muted}>{copy.result.noAnswer}</p> : null}
      {showDetails && explanation ? (
        <p className={styles.explanation}>
          <strong>{copy.result.explanation}: </strong>
          {explanation}
        </p>
      ) : null}
    </article>
  );
}
