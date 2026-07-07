import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { fetchTrainingMyRecords } from "@/features/training/trainingApi";
import type { TRAINING_COPY } from "@/features/training/trainingCopy";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type { TrainingMyRecords, TrainingRecord } from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];
type TrainingLanguage = "zh" | "en" | "fr";
type RecordFilter = "all" | "required" | "optional" | "quiz";

const RECORD_LABELS: Record<
  TrainingLanguage,
  {
    all: string;
    averageScore: string;
    filteredEmpty: string;
    historyBody: string;
  }
> = {
  zh: {
    all: "全部",
    averageScore: "平均分",
    filteredEmpty: "当前筛选下暂无记录。",
    historyBody: "已完成资料、测验成绩和回看入口单独归档。",
  },
  en: {
    all: "All",
    averageScore: "Avg score",
    filteredEmpty: "No records match this filter yet.",
    historyBody: "Completed materials, quiz scores, and review links live here.",
  },
  fr: {
    all: "Tous",
    averageScore: "Score moyen",
    filteredEmpty: "Aucun dossier ne correspond à ce filtre pour le moment.",
    historyBody: "Supports terminés, scores quiz et relecture sont classés ici.",
  },
};

type TrainingHistoryViewProps = {
  copy: TrainingCopySet;
  language: TrainingLanguage;
  onOpenRecord?: (record: TrainingRecord) => void;
  refreshToken?: number;
};

function formatDate(value: string | null): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toISOString().slice(0, 10);
}

function formatScore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getPositionLabel(code: string, labels: Record<string, string>): string {
  return labels[code] || code;
}

function matchesRecordFilter(record: TrainingRecord, filter: RecordFilter): boolean {
  if (filter === "required") return record.isRequired;
  if (filter === "optional") return !record.isRequired;
  if (filter === "quiz") return record.hasQuiz;

  return true;
}

export function TrainingHistoryView({
  copy,
  language,
  onOpenRecord,
  refreshToken = 0,
}: TrainingHistoryViewProps) {
  const [records, setRecords] = useState<TrainingMyRecords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<RecordFilter>("all");

  const load = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const nextRecords = await fetchTrainingMyRecords();
      setRecords(nextRecords);
    } catch {
      setErrorMessage(copy.error);
    } finally {
      setIsLoading(false);
    }
  }, [copy.error]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const completed = records?.records ?? [];
  const labels = RECORD_LABELS[language];
  const filterOptions: Array<{ key: RecordFilter; label: string }> = [
    { key: "all", label: labels.all },
    { key: "required", label: copy.required },
    { key: "optional", label: copy.optional },
    { key: "quiz", label: copy.quizTag },
  ];
  const completedCount = records?.completedCount ?? completed.length;
  const averageQuizScore = useMemo(() => {
    const scoredRecords = completed.filter((record) => record.bestQuizScore !== null);

    if (scoredRecords.length === 0) return null;

    const total = scoredRecords.reduce((sum, record) => sum + (record.bestQuizScore ?? 0), 0);

    return total / scoredRecords.length;
  }, [completed]);
  const filteredRecords = useMemo(
    () => completed.filter((record) => matchesRecordFilter(record, activeFilter)),
    [activeFilter, completed],
  );

  if (isLoading) {
    return <ZhaoLoadingIndicator label={copy.loading} />;
  }

  if (errorMessage) {
    return (
      <View style={styles.section}>
        <Text style={styles.message}>{errorMessage}</Text>
        <Pressable style={styles.refreshButton} onPress={() => void load()}>
          <Text style={styles.refreshButtonText}>{copy.refresh}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={styles.historyHeaderPanel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy.myRecords}</Text>
          <Text style={styles.sectionCount}>{completedCount}</Text>
        </View>
        <Text style={styles.achievementHeroBody}>{labels.historyBody}</Text>
      </View>

      {completed.length > 0 ? (
        <>
          <View style={styles.statGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{copy.completed}</Text>
              <Text style={styles.statValue}>{completedCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{copy.quizTag}</Text>
              <Text style={styles.statValue}>
                {completed.filter((record) => record.hasQuiz).length}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{labels.averageScore}</Text>
              <Text style={styles.statValue}>
                {averageQuizScore === null ? "-" : `${formatScore(averageQuizScore)}%`}
              </Text>
            </View>
          </View>

          <View style={styles.pillRow}>
            {filterOptions.map((filter) => {
              const selected = filter.key === activeFilter;

              return (
                <Pressable
                  key={filter.key}
                  style={[styles.pill, selected ? styles.filterPillActive : null]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text style={[styles.pillText, selected ? styles.filterPillTextActive : null]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filteredRecords.length > 0 ? (
            <View style={styles.list}>
              {filteredRecords.map((record) => {
                const positionLabel = getPositionLabel(record.positionId, copy.positionLabels);
                const materialType = copy.materialTypes[record.type] || record.type;
                const hasScore = record.bestQuizScore !== null;

                return (
                  <Pressable
                    key={`${record.materialId}-${record.completedAt ?? "completed"}`}
                    style={styles.recordCard}
                    onPress={() => onOpenRecord?.(record)}
                  >
                    <View style={styles.recordHeader}>
                      <Text style={styles.recordTitle} numberOfLines={2}>
                        {record.title}
                      </Text>
                      {hasScore ? (
                        <View
                          style={[
                            styles.recordScorePill,
                            !record.quizPassed ? styles.recordScorePillFailed : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.recordScoreText,
                              !record.quizPassed ? styles.recordScoreTextFailed : null,
                            ]}
                          >
                            {formatScore(record.bestQuizScore)}%
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cardMeta}>
                      {positionLabel} · {materialType} ·{" "}
                      {record.isRequired ? copy.required : copy.optional}
                    </Text>
                    <Text style={styles.recordDate}>
                      {copy.completedOn} {formatDate(record.completedAt)}
                    </Text>
                    {record.hasQuiz ? (
                      <View style={styles.recordBadgeRow}>
                        <View
                          style={[
                            styles.statusPill,
                            record.quizPassed
                              ? styles.recordStatusPillPassed
                              : styles.recordStatusPillFailed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              record.quizPassed
                                ? styles.recordStatusTextPassed
                                : styles.recordStatusTextFailed,
                            ]}
                          >
                            {record.quizPassed ? copy.quizPassed : copy.quizFailed}
                          </Text>
                        </View>
                        <View style={styles.recordAttemptPill}>
                          <Text style={styles.recordAttemptText}>
                            {copy.quizAttempts}: {record.quizAttemptsUsed}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                    <Text style={styles.libraryCardFooter}>
                      {record.hasQuiz ? copy.reviewQuiz : copy.open}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>{labels.filteredEmpty}</Text>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>{copy.recordsEmpty}</Text>
      )}
    </>
  );
}
