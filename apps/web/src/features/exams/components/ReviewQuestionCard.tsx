import type { ExamQuestion, ExamReviewAction } from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import styles from "../exams.module.css";
import StatusBadge from "./StatusBadge";

type ReviewQuestionCardProps = {
  question: ExamQuestion;
  copy: ExamBankCopy;
  isSelected: boolean;
  isFocused: boolean;
  onToggleSelect: () => void;
  onReview: (action: ExamReviewAction) => void;
  onEdit: () => void;
};

/** Admin view of one question: both languages side by side, correct options highlighted. */
export default function ReviewQuestionCard({
  question,
  copy,
  isSelected,
  isFocused,
  onToggleSelect,
  onReview,
  onEdit,
}: ReviewQuestionCardProps) {
  const correct = new Set(question.correctKeys);
  const category = question.category
    ? `${question.category.nameZh} / ${question.category.nameFr}`
    : null;

  return (
    <article
      className={`${styles.question} ${isFocused ? styles.questionFocused : ""}`}
      data-question-id={question.id}
    >
      <div className={styles.questionHeader}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`#${question.id}`}
          />
          #{question.id}
        </label>
        <StatusBadge status={question.status} label={copy.questionStatuses[question.status]} />
        <span className={styles.badge}>{copy.types[question.type]}</span>
        <span className={styles.badge}>{copy.difficulties[question.difficulty]}</span>
        {category ? <span className={styles.badge}>{category}</span> : null}
        {question.sourceMaterial ? (
          <span>
            {copy.review.source}: {question.sourceMaterial.title}
          </span>
        ) : null}
      </div>

      {question.knowledgePoint ? (
        <p className={styles.muted}>
          {copy.review.knowledgePoint}: {question.knowledgePoint}
        </p>
      ) : null}
      <p className={styles.prompt}>{question.promptZh}</p>
      <p className={styles.promptSecondary}>{question.promptFr}</p>

      <ul className={styles.options}>
        {question.options.map((option) => (
          <li
            key={option.key}
            className={correct.has(option.key) ? styles.optionCorrect : styles.option}
          >
            <span className={styles.optionKey}>
              {option.key === "true" ? "✓" : option.key === "false" ? "✗" : option.key}
            </span>
            <span>
              {option.zh}
              <br />
              <span className={styles.muted}>{option.fr}</span>
            </span>
          </li>
        ))}
      </ul>

      {question.explanationZh || question.explanationFr ? (
        <div className={styles.explanation}>
          <strong>{copy.review.explanation}: </strong>
          {question.explanationZh}
          <br />
          <span className={styles.muted}>{question.explanationFr}</span>
        </div>
      ) : null}
      {question.evidence ? (
        <div className={styles.explanation}>
          <strong>{copy.review.evidence}: </strong>« {question.evidence} »
        </div>
      ) : null}
      {question.rejectReason ? <p className={styles.error}>{question.rejectReason}</p> : null}

      <div className={styles.actions} style={{ marginTop: 12 }}>
        {question.status !== "APPROVED" ? (
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={() => onReview("approve")}
          >
            {copy.review.approve}
          </button>
        ) : null}
        {question.status !== "REJECTED" ? (
          <button type="button" className={styles.buttonDanger} onClick={() => onReview("reject")}>
            {copy.review.reject}
          </button>
        ) : null}
        {question.status !== "ARCHIVED" ? (
          <button type="button" className={styles.button} onClick={() => onReview("archive")}>
            {copy.review.archive}
          </button>
        ) : null}
        <button type="button" className={styles.button} onClick={onEdit}>
          {copy.edit}
        </button>
      </div>
    </article>
  );
}
