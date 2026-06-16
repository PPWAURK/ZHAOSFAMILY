import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import storeScore1 from "@/features/dashboard/assets/store-score/store-1.jpg";
import storeScore2 from "@/features/dashboard/assets/store-score/store-2.jpg";
import storeScore3 from "@/features/dashboard/assets/store-score/store-3.jpg";
import storeScore4 from "@/features/dashboard/assets/store-score/store-4.jpg";

const colors = authControlStyles.colors;

type StoreScoreGrade = "A" | "B" | "C";

type StoreScoreEntry = {
  id: string;
  name: string;
  area: string;
  grade: StoreScoreGrade;
  score: number;
  trend: string;
  auditDate: string;
  focus: Record<AuthLanguage, string>;
  image: ImageSourcePropType;
};

const STORE_SCORE_ENTRIES: StoreScoreEntry[] = [
  {
    id: "opera",
    name: "ZHAO Opera",
    area: "Paris 02",
    grade: "A",
    score: 96,
    trend: "+4",
    auditDate: "2026-06-10",
    focus: { zh: "出品稳定", en: "Stable output", fr: "Qualité stable" },
    image: storeScore1,
  },
  {
    id: "saint-lazare",
    name: "ZHAO Saint-Lazare",
    area: "Paris 08",
    grade: "B",
    score: 84,
    trend: "+3",
    auditDate: "2026-06-09",
    focus: { zh: "服务提速", en: "Faster service", fr: "Service accéléré" },
    image: storeScore2,
  },
  {
    id: "bastille",
    name: "ZHAO Bastille",
    area: "Paris 11",
    grade: "B",
    score: 84,
    trend: "-1",
    auditDate: "2026-06-08",
    focus: { zh: "晚高峰复盘", en: "Peak review", fr: "Revue heure de pointe" },
    image: storeScore3,
  },
  {
    id: "republique",
    name: "ZHAO Republique",
    area: "Paris 10",
    grade: "C",
    score: 64,
    trend: "-4",
    auditDate: "2026-06-07",
    focus: { zh: "卫生复查", en: "Hygiene recheck", fr: "Contrôle hygiène" },
    image: storeScore4,
  },
];

const COPY = {
  zh: {
    kicker: "Store Score · Ranking",
    title: "门店评分排行榜",
    subtitle: "先使用虚假数据展示每家门店的 A / B / C 等级，后续可替换为真实评分接口。",
    storeUnit: "家",
    auditLabel: "检查",
    tieLabel: "并列",
    trackingLabel: "后续追踪",
    placeLabel: (rank: number) => `第 ${rank} 名`,
  },
  en: {
    kicker: "Store Score · Ranking",
    title: "Store score ranking",
    subtitle:
      "Mock data for each store's A / B / C grade. This can later be wired to the real scoring API.",
    storeUnit: "stores",
    auditLabel: "Audit",
    tieLabel: "Tie",
    trackingLabel: "Follow-up",
    placeLabel: (rank: number) => `No. ${rank}`,
  },
  fr: {
    kicker: "Store Score · Ranking",
    title: "Classement des boutiques",
    subtitle:
      "Données fictives pour afficher les niveaux A / B / C de chaque boutique. La section pourra ensuite utiliser l'API réelle.",
    storeUnit: "boutiques",
    auditLabel: "Audit",
    tieLabel: "Ex aequo",
    trackingLabel: "Suivi",
    placeLabel: (rank: number) => `Rang ${rank}`,
  },
};

const GRADE_COLORS: Record<StoreScoreGrade, string> = {
  A: colors.success,
  B: "#b8860b",
  C: colors.red,
};

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

function getGradeCount(grade: StoreScoreGrade): number {
  return STORE_SCORE_ENTRIES.filter((entry) => entry.grade === grade).length;
}

type StoreScoreLeaderboardProps = {
  language: AuthLanguage;
};

export function StoreScoreLeaderboard({ language }: StoreScoreLeaderboardProps) {
  const copy = COPY[language];
  const rankedEntries = getRankedEntries(STORE_SCORE_ENTRIES);
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

      <View style={styles.summary}>
        {(["A", "B", "C"] as StoreScoreGrade[]).map((grade) => (
          <View key={grade} style={styles.summaryItem}>
            <Text style={[styles.summaryGrade, { color: GRADE_COLORS[grade] }]}>
              {grade}
            </Text>
            <Text style={styles.summaryCount}>{getGradeCount(grade)}</Text>
            <Text style={styles.summaryUnit}>{copy.storeUnit}</Text>
          </View>
        ))}
      </View>

      <View style={styles.podium}>
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
                  source={entry.image}
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
                <View style={[styles.gradeChip, { borderColor: GRADE_COLORS[entry.grade] }]}>
                  <Text style={[styles.gradeText, { color: GRADE_COLORS[entry.grade] }]}>
                    {entry.grade}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.trend, { color: trendDown ? colors.red : colors.success }]}
              >
                {entry.trend}
                {entry.isTied ? ` · ${copy.tieLabel}` : ""}
              </Text>
              <Text style={styles.podiumFocus} numberOfLines={1}>
                {entry.focus[language]}
              </Text>
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
                <Image source={entry.image} style={styles.trackPhoto} />
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
                          width: `${entry.score}%`,
                          backgroundColor: GRADE_COLORS[entry.grade],
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.trackRight}>
                  <Text style={styles.trackScore}>{entry.score}</Text>
                  <Text
                    style={[
                      styles.trend,
                      { color: trendDown ? colors.red : colors.success },
                    ]}
                  >
                    {entry.trend}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
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
