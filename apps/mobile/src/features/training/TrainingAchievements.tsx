import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { TitleBadge } from "@/features/training/TitleBadge";
import {
  fetchTrainingMyRecords,
  fetchTrainingMyTitles,
} from "@/features/training/trainingApi";
import type { TRAINING_COPY } from "@/features/training/trainingCopy";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type {
  TrainingMyRecords,
  TrainingMyTitles,
} from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type TrainingAchievementsProps = {
  copy: TrainingCopySet;
  language: "zh" | "en" | "fr";
  refreshToken: number;
};

function formatDate(value: string | null): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toISOString().slice(0, 10);
}

export function TrainingAchievements({
  copy,
  language,
  refreshToken,
}: TrainingAchievementsProps) {
  const [titles, setTitles] = useState<TrainingMyTitles | null>(null);
  const [records, setRecords] = useState<TrainingMyRecords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const [nextTitles, nextRecords] = await Promise.all([
        fetchTrainingMyTitles(),
        fetchTrainingMyRecords(),
      ]);
      setTitles(nextTitles);
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

  const earned = titles?.earned ?? [];
  const available = titles?.available ?? [];
  const completed = records?.records ?? [];

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy.myTitles}</Text>
          <Text style={styles.sectionCount}>{earned.length}</Text>
        </View>
        {earned.length > 0 ? (
          <View style={styles.titleBadgeRow}>
            {earned.map((title) => (
              <TitleBadge key={title.code} title={title} language={language} />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{copy.titlesEmpty}</Text>
        )}
      </View>

      {available.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionSubTitle}>{copy.titlesLocked}</Text>
          <View style={styles.titleBadgeRow}>
            {available.map((title) => (
              <TitleBadge key={title.code} title={title} language={language} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy.myRecords}</Text>
          <Text style={styles.sectionCount}>{completed.length}</Text>
        </View>
        {completed.length > 0 ? (
          <View style={styles.list}>
            {completed.map((record) => (
              <View key={record.materialId} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle} numberOfLines={2}>
                    {record.title}
                  </Text>
                  {record.quizScore !== null ? (
                    <View style={styles.recordScorePill}>
                      <Text style={styles.recordScoreText}>
                        {record.quizScore}%
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardMeta}>
                  {record.positionId} ·{" "}
                  {copy.materialTypes[record.type] || record.type} ·{" "}
                  {record.isRequired ? copy.required : copy.optional}
                </Text>
                <Text style={styles.recordDate}>
                  {copy.completedOn} {formatDate(record.completedAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{copy.recordsEmpty}</Text>
        )}
      </View>
    </>
  );
}
