"use client";

import { useState } from "react";
import type { ExamAttempt } from "@zhao/types";

import type { ExamCopy } from "../constants/exam-copy";
import { defaultContentLanguage, pickText, type ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import ContentLanguageSwitch from "./ContentLanguageSwitch";
import ResultQuestionCard from "./ResultQuestionCard";
import SectionResultsView from "./SectionResultsView";

type AttemptResultViewProps = { attempt: ExamAttempt; lang: ExamUiLanguage; copy: ExamCopy };

/** Score summary plus every graded question; shared by the employee and admin result pages. */
export default function AttemptResultView({ attempt, lang, copy }: AttemptResultViewProps) {
  const [language, setLanguage] = useState(defaultContentLanguage(lang));
  const result = attempt.result;
  if (!result) return null;

  return (
    <>
      <h2 className={styles.sectionTitle}>
        {pickText(language, attempt.titleZh, attempt.titleFr)}
      </h2>
      <div className={styles.scoreBlock}>
        <span className={styles.score}>{result.score}</span>
        <span className={result.passed ? styles.badgeOk : styles.badgeBad}>
          {result.passed ? copy.result.pass : copy.result.fail}
        </span>
        <span className={styles.muted}>
          {copy.result.correctCount(result.correctCount, attempt.totalCount)}
        </span>
        <span className={styles.muted}>{copy.passing(attempt.passingScore)}</span>
      </div>
      <SectionResultsView
        result={result}
        passingScore={attempt.passingScore}
        copy={copy}
        language={language}
      />
      {attempt.status === "EXPIRED" ? <p className={styles.notice}>{copy.result.expired}</p> : null}
      {!result.showExplanations ? <p className={styles.notice}>{copy.result.hidden}</p> : null}
      <ContentLanguageSwitch label={copy.contentLanguage} value={language} onChange={setLanguage} />
      {result.items.map((item, index) => (
        <ResultQuestionCard
          key={item.id}
          item={item}
          index={index}
          language={language}
          copy={copy}
          showDetails={result.showExplanations}
        />
      ))}
    </>
  );
}
