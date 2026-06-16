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
    focusLabel: "关注点",
  },
  en: {
    kicker: "Store Score · Ranking",
    title: "Store score ranking",
    subtitle:
      "Mock data for each store's A / B / C grade. This can later be wired to the real scoring API.",
    storeUnit: "stores",
    auditLabel: "Audit",
    tieLabel: "Tie",
    focusLabel: "Focus",
  },
  fr: {
    kicker: "Store Score · Ranking",
    title: "Classement des boutiques",
    subtitle:
      "Données fictives pour afficher les niveaux A / B / C de chaque boutique. La section pourra ensuite utiliser l'API réelle.",
    storeUnit: "boutiques",
    auditLabel: "Audit",
    tieLabel: "Ex aequo",
    focusLabel: "Point clé",
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

function getGradeCount(grade: StoreScoreGrade): number {
  return STORE_SCORE_ENTRIES.filter((entry) => entry.grade === grade).length;
}

type StoreScoreLeaderboardProps = {
  language: AuthLanguage;
};

export function StoreScoreLeaderboard({ language }: StoreScoreLeaderboardProps) {
  const copy = COPY[language];
  const rankedEntries = getRankedEntries(STORE_SCORE_ENTRIES);

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

      <View style={styles.list}>
        {rankedEntries.map((entry) => {
          const medalColor = MEDAL_COLORS[entry.displayRank] || colors.ink20;
          const trendDown = entry.trend.startsWith("-");

          return (
            <View key={entry.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.rankBadge, { borderColor: medalColor }]}>
                  <Text style={[styles.rankText, { color: medalColor }]}>
                    {String(entry.displayRank).padStart(2, "0")}
                  </Text>
                </View>
                <Image source={entry.image} style={styles.photo} />
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={styles.storeMeta} numberOfLines={1}>
                    {entry.area} · {copy.auditLabel} {entry.auditDate}
                    {entry.isTied ? ` · ${copy.tieLabel}` : ""}
                  </Text>
                </View>
                <View
                  style={[styles.gradeChip, { borderColor: GRADE_COLORS[entry.grade] }]}
                >
                  <Text style={[styles.gradeText, { color: GRADE_COLORS[entry.grade] }]}>
                    {entry.grade}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.scoreRow}>
                  <Text style={styles.score}>{entry.score}</Text>
                  <Text
                    style={[
                      styles.trend,
                      { color: trendDown ? colors.red : colors.success },
                    ]}
                  >
                    {entry.trend}
                  </Text>
                </View>
                <Text style={styles.focus} numberOfLines={1}>
                  {copy.focusLabel} · {entry.focus[language]}
                </Text>
              </View>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${entry.score}%`,
                      backgroundColor: GRADE_COLORS[entry.grade],
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
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
    marginBottom: 18,
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
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.ink10,
    padding: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 13,
    fontWeight: "800",
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.ink05,
  },
  storeInfo: {
    flex: 1,
    minWidth: 0,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  storeMeta: {
    marginTop: 2,
    fontSize: 11.5,
    color: colors.ink40,
  },
  gradeChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 12,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  score: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.ink,
  },
  trend: {
    fontSize: 13,
    fontWeight: "700",
  },
  focus: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.ink60,
    textAlign: "right",
  },
  barTrack: {
    marginTop: 10,
    height: 4,
    backgroundColor: colors.ink05,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
});
