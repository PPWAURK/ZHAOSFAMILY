import { Text, View } from "react-native";
import type { ExamRuleResult, ExamSectionScore } from "@zhao/types";
import { pickExamText, type ExamContentLanguage } from "@zhao/utils";

import type { ExamCopy } from "@/features/exams/examCopy";
import { examStyles as styles } from "@/features/exams/examStyles";

type ExamResultBreakdownProps = {
  score: number;
  passingScore: number;
  passed: boolean;
  sections: readonly ExamSectionScore[] | null;
  rules: readonly ExamRuleResult[];
  copy: ExamCopy;
  language: ExamContentLanguage;
};

/**
 * 「企业文化 错 2 题（最多允许错 1 题），本次考试不通过」 when the score reached
 * the pass mark but a veto rule failed the paper; null otherwise.
 */
export function describeExamVeto(
  {
    score,
    passingScore,
    passed,
    rules,
  }: Pick<ExamResultBreakdownProps, "score" | "passingScore" | "passed" | "rules">,
  copy: ExamCopy,
  language: ExamContentLanguage,
): string | null {
  const failed = rules.filter((rule) => !rule.passed);
  if (passed || score < passingScore || !failed.length) return null;
  const details = failed
    .map((rule) =>
      copy.result.ruleFailed(
        pickExamText(language, rule.labelZh, rule.labelFr),
        rule.wrongCount,
        rule.maxWrong,
      ),
    )
    .join(copy.result.vetoSeparator);
  return copy.result.vetoNotice(details);
}

/** Per-section scores and veto rules of a sectioned paper; nothing for a simple one. */
export function ExamResultBreakdown(props: ExamResultBreakdownProps) {
  const { sections, rules, copy, language } = props;
  const veto = describeExamVeto(props, copy, language);
  return (
    <>
      {veto ? <Text style={styles.error}>{veto}</Text> : null}
      {sections?.length ? (
        <View style={styles.card}>
          <Text style={styles.statLabel}>{copy.result.sectionScores}</Text>
          {sections.map((section, i) => (
            <View key={`${i}-${section.titleZh}`} style={styles.resultRow}>
              <Text style={styles.resultRowText}>
                {pickExamText(language, section.titleZh, section.titleFr)}
              </Text>
              <Text style={styles.muted}>
                {copy.result.correctCount(section.correctCount, section.totalCount)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {rules.length ? (
        <View style={styles.card}>
          <Text style={styles.statLabel}>{copy.result.rules}</Text>
          {rules.map((rule) => (
            <View key={rule.categoryId} style={styles.resultRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.resultRowText}>
                  {pickExamText(language, rule.labelZh, rule.labelFr)}
                </Text>
                <Text style={styles.muted}>
                  {copy.result.ruleLine(rule.wrongCount, rule.maxWrong)}
                </Text>
              </View>
              <Text style={rule.passed ? styles.passChip : styles.failChip}>
                {rule.passed ? copy.result.pass : copy.result.fail}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
