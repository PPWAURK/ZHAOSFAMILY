import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { scaleStyles } from "@/lib/responsive";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import { fetchTrainingMyBadges } from "@/features/training/trainingApi";
import { TrainingBadgeSvg } from "@/features/training/TrainingBadgeSvg";
import type { TrainingMyBadges } from "@/features/training/trainingTypes";

const COLORS = authControlStyles.colors;

function getBadgeName(
  badge: TrainingMyBadges["badges"][number],
  language: string,
): string {
  return badge.name[language as keyof typeof badge.name] || badge.name.zh || badge.code;
}

function getCompletionRateWidth(completionRate: number): ViewStyle["width"] {
  const safeCompletionRate = Math.max(0, Math.min(100, completionRate));

  return `${safeCompletionRate}%` as ViewStyle["width"];
}

export function CertificationWall({
  language,
  labels,
}: {
  language: string;
  labels: {
    heading: string;
    hint: string;
    empty: string;
    inProgress: string;
    level: string;
    loading: string;
    error: string;
  };
}) {
  const [badges, setBadges] = useState<TrainingMyBadges | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchTrainingMyBadges();
        if (active) setBadges(data);
      } catch {
        if (active) setError(labels.error);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [labels.error]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{labels.loading}</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={styles.hint}>{error}</Text>;
  }

  if (!badges) return null;

  const certified = badges.badges.filter((b) => b.status === "certified");
  const inProgress = badges.badges.filter(
    (b) => b.status === "in_progress" || b.status === "failed",
  );

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.sectionTitle}>{labels.heading}</Text>
          <Text style={styles.hint}>
            {labels.hint
              .replace("{earned}", String(certified.length))
              .replace("{total}", String(badges.totalCount))}
          </Text>
        </View>
      </View>

      {certified.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {certified.map((badge) => (
            <View key={badge.code} style={styles.card}>
              <TrainingBadgeSvg badge={badge} size={76} />
              <Text style={styles.badgeName} numberOfLines={2}>
                {getBadgeName(badge, language)}
              </Text>
              <Text style={styles.badgeMeta}>
                {badge.level ? `${labels.level} ${badge.level}` : ""}
                {badge.level && badge.earnedAt ? " · " : ""}
                {badge.earnedAt ? badge.earnedAt.slice(0, 10) : ""}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.hint}>{labels.empty}</Text>
      )}

      {inProgress.length > 0 ? (
        <>
          <Text style={styles.subheading}>{labels.inProgress}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {inProgress.map((badge) => (
              <View key={badge.code} style={styles.card}>
                <TrainingBadgeSvg badge={badge} size={76} />
                <Text style={styles.badgeName} numberOfLines={2}>
                  {getBadgeName(badge, language)}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: getCompletionRateWidth(badge.completionRate) },
                    ]}
                  />
                </View>
                <Text style={styles.badgeMeta}>{badge.completionRate}%</Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create(
  scaleStyles({
    loadingContainer: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      paddingVertical: 8,
    },
    loadingText: {
      color: COLORS.ink60,
      fontFamily: "serif",
      fontSize: 13,
      lineHeight: 20,
    },
    hint: {
      color: COLORS.ink60,
      fontFamily: "serif",
      fontSize: 13,
      lineHeight: 20,
    },
    sectionHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    sectionTitleGroup: {
      flex: 1,
      gap: 5,
    },
    sectionTitle: {
      color: COLORS.ink,
      fontFamily: "serif",
      fontSize: 21,
      fontWeight: "600",
      lineHeight: 25,
    },
    subheading: {
      color: COLORS.ink60,
      fontFamily: "serif",
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 20,
    },
    scrollContent: {
      gap: 10,
      paddingBottom: 4,
    },
    card: {
      alignItems: "center",
      backgroundColor: COLORS.paper,
      borderColor: COLORS.ink10,
      borderWidth: 1,
      gap: 6,
      padding: 12,
      width: 112,
      minHeight: 162,
    },
    badgeName: {
      color: COLORS.ink,
      fontFamily: "serif",
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 17,
      textAlign: "center",
    },
    badgeMeta: {
      color: COLORS.ink40,
      fontFamily: "monospace",
      fontSize: 9,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    progressTrack: {
      backgroundColor: COLORS.ink10,
      height: 4,
      overflow: "hidden",
      width: "100%",
    },
    progressFill: {
      backgroundColor: COLORS.red,
      height: "100%",
    },
  }),
);
