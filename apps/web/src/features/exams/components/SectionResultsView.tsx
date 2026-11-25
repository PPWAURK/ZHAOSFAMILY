import type { ExamAttempt } from "@zhao/types";

import type { ExamCopy } from "../constants/exam-copy";
import { pickText, type ExamContentLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import { failedRules, isFailedByRule } from "../utils/examSections";

type SectionResultsViewProps = {
  result: NonNullable<ExamAttempt["result"]>;
  passingScore: number;
  copy: ExamCopy;
  language: ExamContentLanguage;
};

/**
 * Sectioned papers: score per section and the veto rules. When the score
 * alone would pass, says explicitly which rule failed the paper.
 */
export default function SectionResultsView({
  result,
  passingScore,
  copy,
  language,
}: SectionResultsViewProps) {
  const labels = copy.result;
  const rules = result.rules ?? [];
  const sections = result.sections ?? [];

  return (
    <>
      {isFailedByRule(result, passingScore)
        ? failedRules(result).map((rule) => (
            <p key={rule.categoryId} className={styles.error} role="alert">
              {labels.failedByRule(
                pickText(language, rule.labelZh, rule.labelFr),
                rule.wrongCount,
                rule.maxWrong,
              )}
            </p>
          ))
        : null}
      {sections.length ? (
        <div className={planStyles.resultBlock}>
          <h3 className={styles.field}>{labels.sectionScores}</h3>
          <ul>
            {sections.map((section, index) => (
              <li key={`${section.titleZh}-${index}`}>
                <strong>{pickText(language, section.titleZh, section.titleFr)}</strong>
                <span>{labels.correctCount(section.correctCount, section.totalCount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rules.length ? (
        <div className={planStyles.resultBlock}>
          <h3 className={styles.field}>{labels.rules}</h3>
          <ul>
            {rules.map((rule) => (
              <li key={rule.categoryId}>
                <span>
                  {labels.ruleLine(
                    pickText(language, rule.labelZh, rule.labelFr),
                    rule.wrongCount,
                    rule.maxWrong,
                  )}
                </span>
                <span className={rule.passed ? styles.badgeOk : styles.badgeBad}>
                  {rule.passed ? labels.rulePassed : labels.ruleFailed}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
