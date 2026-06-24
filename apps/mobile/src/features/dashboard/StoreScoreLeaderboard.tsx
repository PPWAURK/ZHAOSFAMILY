import { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import zhaoLogo from "@/features/auth/assets/logozhao正方形.jpg";
import {
  fetchPublishedLeaderboard,
  type StoreScoreEntry,
  type StoreScoreGrade,
} from "@/features/dashboard/abcLeaderboardApi";

const colors = authControlStyles.colors;

const COPY = {
  zh: {
    kicker: "Store Score · Ranking",
    title: "门店评分排行榜",
    subtitle: "展示最新一期已发布的门店 A / B / C 评分与排名。",
    storeUnit: "家",
    auditLabel: "检查",
    tieLabel: "并列",
    trackingLabel: "后续追踪",
    loadingLabel: "正在加载排行榜…",
    emptyLabel: "暂无已发布的评分周期，敬请期待。",
    errorLabel: "排行榜加载失败，请稍后重试。",
    placeLabel: (rank: number) => `第 ${rank} 名`,
  },
  en: {
    kicker: "Store Score · Ranking",
    title: "Store score ranking",
    subtitle:
      "Latest published A / B / C grades and ranking for each store.",
    storeUnit: "stores",
    auditLabel: "Audit",
    tieLabel: "Tie",
    trackingLabel: "Follow-up",
    loadingLabel: "Loading ranking…",
    emptyLabel: "No published scoring cycle yet — stay tuned.",
    errorLabel: "Could not load the ranking. Please try again later.",
    placeLabel: (rank: number) => `No. ${rank}`,
  },
  fr: {
    kicker: "Store Score · Ranking",
    title: "Classement des boutiques",
    subtitle:
      "Derniers niveaux A / B / C publiés et classement de chaque boutique.",
    storeUnit: "boutiques",
    auditLabel: "Audit",
    tieLabel: "Ex aequo",
    trackingLabel: "Suivi",
    loadingLabel: "Chargement du classement…",
    emptyLabel: "Aucun cycle de notation publié pour l'instant.",
    errorLabel: "Échec du chargement du classement. Réessayez plus tard.",
    placeLabel: (rank: number) => `Rang ${rank}`,
  },
};

const GRADE_COLORS: Record<StoreScoreGrade, string> = {
  A: colors.success,
  B: "#b8860b",
  C: colors.red,
};

function gradeColor(grade: StoreScoreGrade | null): string {
  return grade ? GRADE_COLORS[grade] : colors.ink20;
}

const MEDAL_COLORS: Record<number, string> = {
  1: "#d4af37",
  2: "#9ca3af",
  3: "#b87333",
};

type RankedEntry = StoreScoreEntry & { displayRank: number; isTied: boolean };

function getRankedEntries(entries: StoreScoreEntry[]): RankedEntry[] {
  const sorted = [...entries].sort((left, right) => right.score - left.score);
  const scoreCounts = sorted.reduce<Map<number, number>>((counts, entry) => {
    counts.set(entry.score, (counts.get(entry.score) || 0) + 1);
    return counts;
  }, new Map());

  let currentRank = 0;
  let previousScore: number | null = null;

  return sorted.map((entry, index) => {
    if (entry.score !== previousScore) {
      currentRank = index + 1;
      previousScore = entry.score;
    }

    return {
      ...entry,
      displayRank: currentRank,
      isTied: (scoreCounts.get(entry.score) || 0) > 1,
    };
  });
}

// Arrange the top three as a podium: 2nd · 1st · 3rd, so the winner sits in
// the middle (mirrors the web layout).
function getPodiumOrder(top: RankedEntry[]): RankedEntry[] {
  if (top.length < 3) return top;
  return [top[1], top[0], top[2]];
}

function getGradeCount(
  entries: StoreScoreEntry[],
  grade: StoreScoreGrade,
): number {
  return entries.filter((entry) => entry.grade === grade).length;
}

type LeaderboardStatus = "loading" | "ready" | "empty" | "error";

type StoreScoreLeaderboardProps = {
  language: AuthLanguage;
};

export function StoreScoreLeaderboard({ language }: StoreScoreLeaderboardProps) {
  const copy = COPY[language];
  const { width } = useWindowDimensions();
  // The dashboard scroll content uses paddingHorizontal: 20 on each side, so
  // pin the podium row to that inner width — otherwise its three flex columns
  // size to content inside the vertical ScrollView and overflow the screen.
  const podiumWidth = width - 40;

  const [entries, setEntries] = useState<StoreScoreEntry[]>([]);
  const [status, setStatus] = useState<LeaderboardStatus>("loading");

  useEffect(() => {
    let isCancelled = false;

    async function loadLeaderboard(): Promise<void> {
      setStatus("loading");
      try {
        const mapped = await fetchPublishedLeaderboard();

        if (isCancelled) return;

        if (!mapped || mapped.length === 0) {
          setEntries([]);
          setStatus("empty");
          return;
        }

        setEntries(mapped);
        setStatus("ready");
      } catch {
        if (!isCancelled) {
          setEntries([]);
          setStatus("error");
        }
      }
    }

    void loadLeaderboard();

    return () => {
      isCancelled = true;
    };
  }, []);

  const rankedEntries = getRankedEntries(entries);
  const podiumEntries = getPodiumOrder(rankedEntries.slice(0, 3));
  const trackingEntries = rankedEntries.slice(3);

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
          {status === "loading"
            ? copy.loadingLabel
            : status === "error"
              ? copy.errorLabel
              : copy.emptyLabel}
        </Text>
      ) : null}

      {status === "ready" ? (
        <>
      <View style={styles.summary}>
        {(["A", "B", "C"] as StoreScoreGrade[]).map((grade) => (
          <View key={grade} style={styles.summaryItem}>
            <Text style={[styles.summaryGrade, { color: GRADE_COLORS[grade] }]}>
              {grade}
            </Text>
            <Text style={styles.summaryCount}>
              {getGradeCount(entries, grade)}
            </Text>
            <Text style={styles.summaryUnit}>{copy.storeUnit}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.podium, { width: podiumWidth }]}>
        {podiumEntries.map((entry) => {
          const isWinner = entry.displayRank === 1;
          const medalColor = MEDAL_COLORS[entry.displayRank] || colors.ink20;
          const trendDown = entry.trend.startsWith("-");

          return (
            <View
              key={entry.id}
              style={[styles.podiumCol, isWinner ? styles.podiumWinner : null]}
            >
              <View style={styles.podiumPhotoWrap}>
                <Image
                  source={entry.photoUri ? { uri: entry.photoUri } : zhaoLogo}
                  style={[
                    styles.podiumPhoto,
                    isWinner ? styles.podiumPhotoWinner : null,
                    { borderColor: medalColor },
                  ]}
                />
                <View style={[styles.medal, { backgroundColor: medalColor }]}>
                  <Text style={styles.medalText}>{entry.displayRank}</Text>
                </View>
              </View>

              <Text style={styles.placeLabel}>
                {copy.placeLabel(entry.displayRank)}
              </Text>
              <Text
                style={[styles.podiumName, isWinner ? styles.podiumNameWinner : null]}
                numberOfLines={1}
              >
                {entry.name}
              </Text>
              <Text style={styles.podiumArea} numberOfLines={1}>
                {entry.area}
              </Text>

              <View style={styles.podiumScoreRow}>
                <Text
                  style={[styles.podiumScore, isWinner ? styles.podiumScoreWinner : null]}
                >
                  {entry.score}
                </Text>
                {entry.grade ? (
                  <View style={[styles.gradeChip, { borderColor: gradeColor(entry.grade) }]}>
                    <Text style={[styles.gradeText, { color: gradeColor(entry.grade) }]}>
                      {entry.grade}
                    </Text>
                  </View>
                ) : null}
              </View>

              {entry.trend || entry.isTied ? (
                <Text
                  style={[styles.trend, { color: trendDown ? colors.red : colors.success }]}
                >
                  {entry.trend}
                  {entry.isTied ? `${entry.trend ? " · " : ""}${copy.tieLabel}` : ""}
                </Text>
              ) : null}
              {entry.focus ? (
                <Text style={styles.podiumFocus} numberOfLines={1}>
                  {entry.focus}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {trackingEntries.length > 0 ? (
        <View style={styles.tracking}>
          <Text style={styles.trackingHead}>{copy.trackingLabel}</Text>
          {trackingEntries.map((entry) => {
            const trendDown = entry.trend.startsWith("-");

            return (
              <View key={entry.id} style={styles.trackRow}>
                <Text style={styles.trackRank}>
                  {String(entry.displayRank).padStart(2, "0")}
                </Text>
                <Image
                  source={entry.photoUri ? { uri: entry.photoUri } : zhaoLogo}
                  style={styles.trackPhoto}
                />
                <View style={styles.trackInfo}>
                  <Text style={styles.trackName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={styles.trackMeta} numberOfLines={1}>
                    {entry.area} · {copy.auditLabel} {entry.auditDate}
                  </Text>
                  <View style={styles.trackBarTrack}>
                    <View
                      style={[
                        styles.trackBarFill,
                        {
                          width: `${Math.min(entry.score, 100)}%`,
                          backgroundColor: gradeColor(entry.grade),
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.trackRight}>
                  <Text style={styles.trackScore}>{entry.score}</Text>
                  {entry.trend ? (
                    <Text
                      style={[
                        styles.trend,
                        { color: trendDown ? colors.red : colors.success },
                      ]}
                    >
                      {entry.trend}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
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
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 24,
  },
  podiumCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.ink10,
  },
  podiumWinner: {
    paddingTop: 8,
    borderColor: "#d4af37",
    backgroundColor: "rgba(212, 175, 55, 0.06)",
  },
  podiumPhotoWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  podiumPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: colors.ink05,
  },
  podiumPhotoWinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  medal: {
    position: "absolute",
    bottom: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.paper,
  },
  medalText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.paper,
  },
  placeLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.ink40,
    textTransform: "uppercase",
  },
  podiumName: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
    width: "100%",
  },
  podiumNameWinner: {
    fontSize: 13,
  },
  podiumArea: {
    fontSize: 10.5,
    color: colors.ink40,
  },
  podiumScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  podiumScore: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  podiumScoreWinner: {
    fontSize: 26,
  },
  gradeChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  trend: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 4,
  },
  podiumFocus: {
    marginTop: 4,
    fontSize: 10.5,
    color: colors.ink60,
    textAlign: "center",
  },
  tracking: {
    gap: 10,
  },
  trackingHead: {
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.red,
    fontWeight: "700",
    marginBottom: 2,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 10,
  },
  trackRank: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink40,
    width: 22,
  },
  trackPhoto: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: colors.ink05,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  trackName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  trackMeta: {
    marginTop: 1,
    fontSize: 11,
    color: colors.ink40,
  },
  trackBarTrack: {
    marginTop: 6,
    height: 4,
    backgroundColor: colors.ink05,
    borderRadius: 2,
    overflow: "hidden",
  },
  trackBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  trackRight: {
    alignItems: "flex-end",
  },
  trackScore: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
});
