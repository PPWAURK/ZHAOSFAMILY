import type { ExamAttemptQuestion } from "@zhao/types";

import type { ExamCopy } from "../constants/exam-copy";
import { pickText, type ExamContentLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";

type AnswerQuestionCardProps = {
  question: ExamAttemptQuestion;
  index: number;
  total: number;
  selectedKeys: readonly string[];
  language: ExamContentLanguage;
  copy: ExamCopy;
  isDisabled: boolean;
  onSelect: (key: string) => void;
};

/** Radio buttons for single/true-false, checkboxes for multiple choice. */
export default function AnswerQuestionCard({
  question,
  index,
  total,
  selectedKeys,
  language,
  copy,
  isDisabled,
  onSelect,
}: AnswerQuestionCardProps) {
  const isMultiple = question.type === "multiple";
  const name = `question-${question.id}`;
  return (
    <fieldset className={styles.question} disabled={isDisabled}>
      <legend className={styles.questionHeader}>
        {copy.question(index + 1, total)} · {copy.types[question.type]}
      </legend>
      <p className={styles.prompt}>{pickText(language, question.promptZh, question.promptFr)}</p>
      {isMultiple ? <p className={styles.muted}>{copy.multipleHint}</p> : null}
      <ul className={styles.options}>
        {question.options.map((option) => {
          const isChecked = selectedKeys.includes(option.key);
          return (
            <li key={option.key} className={isChecked ? styles.optionSelected : styles.option}>
              <label>
                <input
                  type={isMultiple ? "checkbox" : "radio"}
                  name={name}
                  value={option.key}
                  checked={isChecked}
                  onChange={() => onSelect(option.key)}
                />
                <span>{pickText(language, option.zh, option.fr)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
