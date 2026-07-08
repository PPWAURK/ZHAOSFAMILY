import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { scaleStyles } from "@/lib/responsive";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import { fetchTrainingMyBadges } from "@/features/training/trainingApi";
import type { TrainingMyBadges } from "@/features/training/trainingTypes";
import { MOBILE_API_URL } from "@/lib/env";

const COLORS = authControlStyles.colors;
const BADGE_EMBLEM_SIZE = 76;
const ICON_SVG_SCALE = 2.5;
const BADGE_FRAME_PREFIXES = ["badge"];

function isBadgeFrame(fileName: string): boolean {
  const name = fileName.replace(/\.svg$/i, "");

  return BADGE_FRAME_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}-`));
}

function getBadgeName(
  badge: TrainingMyBadges["badges"][number],
  language: string,
): string {
  return badge.name[language as keyof typeof badge.name] || badge.name.zh || badge.code;
}

function buildBadgeImageUrl(fileName: string): string {
  return `${MOBILE_API_URL}/training/badges/svg/${encodeURIComponent(fileName)}`;
}

function getCompletionRateWidth(completionRate: number): ViewStyle["width"] {
  const safeCompletionRate = Math.max(0, Math.min(100, completionRate));

  return `${safeCompletionRate}%` as ViewStyle["width"];
}

function BadgeSvg({
  badge,
}: {
  badge: TrainingMyBadges["badges"][number];
}) {
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const cacheRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const src = buildBadgeImageUrl(badge.imageFileName || "badge.svg");

    if (cacheRef.current) {
      if (active) setSvgXml(cacheRef.current);
      return;
    }

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("NOT_FOUND");
        return res.text();
      })
      .then((xml) => {
        cacheRef.current = xml;
        if (active) setSvgXml(xml);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [badge.imageFileName, badge.code]);

  if (failed) {
    const name = badge.name.zh || badge.name.en || badge.code;

    return (
      <View style={styles.badgeEmblem}>
        <Text style={styles.badgeEmblemText}>
          {name ? name.charAt(0).toUpperCase() : "?"}
        </Text>
      </View>
    );
  }

  if (!svgXml) {
    return <View style={styles.badgeEmblem} />;
  }

  const imageFileName = badge.imageFileName || "badge.svg";
  const shouldScaleIcon = !isBadgeFrame(imageFileName);

  return (
    <View style={styles.badgeSvgViewport}>
      <SvgXml
        xml={svgXml}
        style={shouldScaleIcon ? styles.scaledBadgeSvg : undefined}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      />
    </View>
  );
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
              <BadgeSvg badge={badge} />
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
                <BadgeSvg badge={badge} />
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
    badgeEmblem: {
      alignItems: "center",
      backgroundColor: COLORS.paper,
      borderColor: COLORS.ink10,
      borderRadius: 8,
      borderWidth: 1,
      height: BADGE_EMBLEM_SIZE,
      justifyContent: "center",
      width: BADGE_EMBLEM_SIZE,
    },
    badgeSvgViewport: {
      alignItems: "center",
      height: BADGE_EMBLEM_SIZE,
      justifyContent: "center",
      overflow: "hidden",
      width: BADGE_EMBLEM_SIZE,
    },
    scaledBadgeSvg: {
      transform: [{ scale: ICON_SVG_SCALE }],
    },
    badgeEmblemText: {
      color: COLORS.red,
      fontFamily: "serif",
      fontSize: 30,
      fontWeight: "700",
      lineHeight: 34,
      textAlign: "center",
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
