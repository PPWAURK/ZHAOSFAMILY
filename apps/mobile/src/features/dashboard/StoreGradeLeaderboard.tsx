import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import zhaoLogo from "@/features/auth/assets/logozhao正方形.jpg";
import {
  fetchPublishedGradeBoard,
  fetchPublishedGradeCycles,
  type PublishedGradeBoard,
  type StoreGradeEntry,
} from "@/features/dashboard/abcGradeBoardApi";

const colors = authControlStyles.colors;
const GRADES = ["A", "B", "C"] as const;
const GRADE_COLORS = {
  A: "#c79a1e",
  B: "#8c93a0",
  C: "#b16a34",
};

const COPY = {
  zh: {
    kicker: "ABC STORE GRADES",
    title: "门店 ABC 评级榜",
    subtitle: "展示最新已发布周期的 A、B、C 级门店。检查报告仅向总部及管理层开放。",
    storeUnit: "家门店",
    cycleLabel: "检查周期",
    previousCycle: "查看较新周期",
    nextCycle: "查看较早周期",
    loading: "正在加载门店评级…",
    empty: "暂无已发布的门店评级周期。",
    error: "门店评级加载失败，请稍后重试。",
  },
  en: {
    kicker: "ABC STORE GRADES",
    title: "ABC store grade board",
    subtitle:
      "A, B and C store grades from the latest published cycle. Reports remain restricted to headquarters and management.",
    storeUnit: "stores",
    cycleLabel: "Inspection cycle",
    previousCycle: "View newer cycle",
    nextCycle: "View older cycle",
    loading: "Loading store grades…",
    empty: "No published store grade cycle yet.",
    error: "Store grades could not be loaded. Please try again later.",
  },
  fr: {
    kicker: "NIVEAUX ABC DES BOUTIQUES",
    title: "Tableau des niveaux ABC",
    subtitle:
      "Niveaux A, B et C du dernier cycle publié. Les rapports restent réservés au siège et au management.",
    storeUnit: "boutiques",
    cycleLabel: "Cycle d'inspection",
    previousCycle: "Voir le cycle plus récent",
    nextCycle: "Voir le cycle plus ancien",
    loading: "Chargement des niveaux…",
    empty: "Aucun cycle de niveaux publié pour le moment.",
    error: "Impossible de charger les niveaux. Réessayez plus tard.",
  },
};

type LeaderboardStatus = "loading" | "ready" | "empty" | "error";

type StoreGradeLeaderboardProps = {
  language: AuthLanguage;
};

function getGradeEntries(entries: StoreGradeEntry[], grade: (typeof GRADES)[number]) {
  return entries.filter((entry) => entry.grade === grade);
}

export function StoreGradeLeaderboard({ language }: StoreGradeLeaderboardProps) {
  const copy = COPY[language];
  const [board, setBoard] = useState<PublishedGradeBoard | null>(null);
  const [cycles, setCycles] = useState<PublishedGradeBoard["cycle"][]>([]);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [status, setStatus] = useState<LeaderboardStatus>("loading");
  const selectedCycle = cycles[cycleIndex] ?? null;
  const entries = board?.entries ?? [];

  useEffect(() => {
    let isCancelled = false;

    async function loadCycles(): Promise<void> {
      setStatus("loading");

      try {
        const publishedCycles = await fetchPublishedGradeCycles();

        if (isCancelled) {
          return;
        }

        if (publishedCycles.length === 0) {
          setCycles([]);
          setStatus("empty");
          return;
        }

        setCycles(publishedCycles);
        setCycleIndex(0);
      } catch {
        if (!isCancelled) {
          setCycles([]);
          setBoard(null);
          setStatus("error");
        }
      }
    }

    void loadCycles();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCycle) {
      return undefined;
    }

    let isCancelled = false;

    async function loadBoard(): Promise<void> {
      setStatus("loading");

      try {
        const nextBoard = await fetchPublishedGradeBoard(selectedCycle.id);

        if (isCancelled) {
          return;
        }

        if (!nextBoard) {
          setBoard(null);
          setStatus("empty");
          return;
        }

        setBoard(nextBoard);
        setStatus("ready");
      } catch {
        if (!isCancelled) {
          setBoard(null);
          setStatus("error");
        }
      }
    }

    void loadBoard();

    return () => {
      isCancelled = true;
    };
  }, [selectedCycle]);

  const showPreviousCycle = useCallback(() => {
    setCycleIndex((index) => Math.max(0, index - 1));
  }, []);

  const showNextCycle = useCallback(() => {
    setCycleIndex((index) => Math.min(cycles.length - 1, index + 1));
  }, [cycles.length]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx <= -64 && cycleIndex < cycles.length - 1) {
            showNextCycle();
          }

          if (gesture.dx >= 64 && cycleIndex > 0) {
            showPreviousCycle();
          }
        },
      }),
    [cycleIndex, cycles.length, showNextCycle, showPreviousCycle],
  );

  return (
    <View style={styles.module}>
      <View style={styles.header}>
        <TrackingText color={colors.red} size={10.5}>
          {copy.kicker}
        </TrackingText>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      {status !== "ready" ? (
        <Text style={styles.stateText}>
          {status === "loading" ? copy.loading : status === "error" ? copy.error : copy.empty}
        </Text>
      ) : null}

      {status === "ready" ? (
        <>
          <View style={styles.cycleBar}>
            <View>
              <Text style={styles.cycleLabel}>{copy.cycleLabel}</Text>
              <Text style={styles.cycleName}>{board?.cycle.label}</Text>
            </View>
            <View style={styles.cycleControls}>
              <Pressable
                accessibilityLabel={copy.previousCycle}
                accessibilityRole="button"
                disabled={cycleIndex === 0}
                style={[styles.cycleButton, cycleIndex === 0 ? styles.cycleButtonDisabled : null]}
                onPress={showPreviousCycle}
              >
                <Text style={styles.cycleButtonText}>←</Text>
              </Pressable>
              <Text style={styles.cyclePosition}>
                {cycleIndex + 1} / {cycles.length}
              </Text>
              <Pressable
                accessibilityLabel={copy.nextCycle}
                accessibilityRole="button"
                disabled={cycleIndex === cycles.length - 1}
                style={[
                  styles.cycleButton,
                  cycleIndex === cycles.length - 1 ? styles.cycleButtonDisabled : null,
                ]}
                onPress={showNextCycle}
              >
                <Text style={styles.cycleButtonText}>→</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.summary}>
            {GRADES.map((grade) => (
              <View key={grade} style={styles.summaryItem}>
                <Text style={[styles.summaryGrade, { color: GRADE_COLORS[grade] }]}>{grade}</Text>
                <Text style={styles.summaryCount}>{getGradeEntries(entries, grade).length}</Text>
                <Text style={styles.summaryUnit}>{copy.storeUnit}</Text>
              </View>
            ))}
          </View>

          <View {...panResponder.panHandlers}>
            {GRADES.map((grade) => {
              const gradeEntries = getGradeEntries(entries, grade);
              const gradeColor = GRADE_COLORS[grade];

              return (
                <View key={grade} style={styles.gradeSection}>
                  <Text style={[styles.gradeHeader, { color: gradeColor }]}>
                    {grade} · {gradeEntries.length} {copy.storeUnit}
                  </Text>

                  {gradeEntries.map((entry) => (
                    <View key={entry.id} style={[styles.storeCard, { borderColor: gradeColor }]}>
                      <Image
                        source={entry.photoUri ? { uri: entry.photoUri } : zhaoLogo}
                        style={styles.storePhoto}
                      />
                      <View style={styles.storeBody}>
                        <Text numberOfLines={1} style={styles.storeName}>
                          {entry.name}
                        </Text>
                        <Text numberOfLines={2} style={styles.storeAddress}>
                          {entry.address}
                        </Text>
                      </View>
                      <Text style={[styles.storeGrade, { color: gradeColor }]}>{grade}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  module: {
    marginTop: 28,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: colors.ink10,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink60,
  },
  stateText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink60,
  },
  cycleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.red,
  },
  cycleLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.ink40,
  },
  cycleName: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  cycleControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cycleButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: colors.ink20,
    alignItems: "center",
    justifyContent: "center",
  },
  cycleButtonDisabled: {
    opacity: 0.35,
  },
  cycleButtonText: {
    fontSize: 18,
    color: colors.red,
  },
  cyclePosition: {
    minWidth: 34,
    fontSize: 11,
    color: colors.ink60,
    textAlign: "center",
  },
  summary: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  summaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.ink10,
  },
  summaryGrade: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  summaryUnit: {
    fontSize: 11,
    color: colors.ink40,
  },
  gradeSection: {
    gap: 10,
    marginBottom: 20,
  },
  gradeHeader: {
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    minHeight: 96,
    padding: 14,
    backgroundColor: colors.paper,
  },
  storePhoto: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: colors.ink05,
  },
  storeBody: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 2,
  },
  storeName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  storeAddress: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink60,
  },
  storeGrade: {
    marginLeft: "auto",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
});
