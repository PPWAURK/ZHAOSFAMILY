import { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { CaseShareAuthorProfile } from "@zhao/types";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { TrainingBadgeSvg } from "@/features/training/TrainingBadgeSvg";
import { TrainingTitleFrame } from "@/features/training/TrainingTitleFrame";
import { fetchCaseShareAuthorProfile } from "@/features/case-shares/caseSharesApi";

type CaseShareAuthorProfileModalProps = {
  authorId: number | null;
  language: AuthLanguage;
  onClose: () => void;
};

function getCopy(language: AuthLanguage) {
  if (language === "en") {
    return {
      badges: "Badges",
      close: "Close",
      error: "Profile could not be loaded. Please try again.",
      noBadges: "No badges earned yet.",
      noTitles: "No titles earned yet.",
      profile: "Partner profile",
      store: "Store",
      titles: "Titles",
    };
  }

  if (language === "fr") {
    return {
      badges: "Badges",
      close: "Fermer",
      error: "Impossible de charger le profil. Réessayez plus tard.",
      noBadges: "Aucun badge obtenu pour le moment.",
      noTitles: "Aucun titre obtenu pour le moment.",
      profile: "Profil partenaire",
      store: "Boutique",
      titles: "Titres",
    };
  }

  return {
    badges: "获得的徽章",
    close: "关闭",
    error: "个人资料加载失败，请稍后重试。",
    noBadges: "暂未获得徽章。",
    noTitles: "暂未获得称号。",
    profile: "伙伴资料",
    store: "门店",
    titles: "获得的称号",
  };
}

function resolveInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "Z";
}

function getLocalizedName(
  item: { code: string; name: { zh: string; en: string; fr: string } },
  language: AuthLanguage,
): string {
  return item.name[language] || item.name.zh || item.code;
}

function AuthorProfileContent({
  profile,
  language,
}: {
  profile: CaseShareAuthorProfile;
  language: AuthLanguage;
}) {
  const copy = getCopy(language);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>{resolveInitial(profile.name)}</Text>
          )}
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.jobRole ? <Text style={styles.role}>{profile.jobRole}</Text> : null}
          <View style={styles.storeRow}>
            <Ionicons color={authControlStyles.colors.red} name="storefront-outline" size={15} />
            <Text style={styles.store}>{profile.restaurant.name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TrackingText color={authControlStyles.colors.red} size={10.5}>
          {copy.titles}
        </TrackingText>
        {profile.titles.length > 0 ? (
          <View style={styles.titleList}>
            {profile.titles.map((title) => (
              <TrainingTitleFrame key={title.code} language={language} title={title} />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>{copy.noTitles}</Text>
        )}
      </View>

      <View style={styles.section}>
        <TrackingText color={authControlStyles.colors.red} size={10.5}>
          {copy.badges}
        </TrackingText>
        {profile.badges.length > 0 ? (
          <View style={styles.badgeGrid}>
            {profile.badges.map((badge) => (
              <View key={badge.code} style={styles.badgeCard}>
                <View style={styles.badgeIcon}>
                  <TrainingBadgeSvg badge={badge} size={76} />
                </View>
                <Text numberOfLines={2} style={styles.badgeName}>
                  {getLocalizedName(badge, language)}
                </Text>
                {badge.level ? <Text style={styles.badgeMeta}>Lv. {badge.level}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>{copy.noBadges}</Text>
        )}
      </View>
    </ScrollView>
  );
}

export function CaseShareAuthorProfileModal({
  authorId,
  language,
  onClose,
}: CaseShareAuthorProfileModalProps) {
  const copy = getCopy(language);
  const [profile, setProfile] = useState<CaseShareAuthorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile(): Promise<void> {
      if (authorId === null) {
        setProfile(null);
        setError("");
        return;
      }

      setIsLoading(true);
      setProfile(null);
      setError("");

      try {
        const result = await fetchCaseShareAuthorProfile(authorId);
        if (active) setProfile(result);
      } catch {
        if (active) setError(copy.error);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [authorId, copy.error]);

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={authorId !== null}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.page}>
        <View style={styles.nav}>
          <Text style={styles.navTitle}>{copy.profile}</Text>
          <Pressable
            accessibilityLabel={copy.close}
            accessibilityRole="button"
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeButton,
              pressed ? styles.closeButtonPressed : null,
            ]}
            onPress={onClose}
          >
            <Ionicons color={authControlStyles.colors.red} name="close" size={25} />
          </Pressable>
        </View>
        {isLoading ? <ZhaoLoadingIndicator label={copy.profile} /> : null}
        {!isLoading && error ? <Text style={styles.error}>{error}</Text> : null}
        {!isLoading && profile ? (
          <AuthorProfileContent language={language} profile={profile} />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.08)",
    borderColor: "rgba(193, 22, 22, 0.22)",
    borderRadius: 0,
    borderWidth: 1,
    height: 88,
    justifyContent: "center",
    overflow: "hidden",
    width: 88,
  },
  avatarImage: { height: "100%", width: "100%" },
  avatarInitial: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 36,
    fontWeight: "700",
  },
  badgeCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(193, 22, 22, 0.14)",
    borderRadius: 0,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 6,
    minHeight: 138,
    padding: 12,
  },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeIcon: {
    alignItems: "center",
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  badgeMeta: { color: authControlStyles.colors.ink60, fontFamily: "monospace", fontSize: 11 },
  badgeName: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
  content: { gap: 28, padding: 20 },
  closeButton: {
    alignItems: "center",
    borderColor: "rgba(193, 22, 22, 0.22)",
    borderRadius: 0,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  closeButtonPressed: {
    backgroundColor: "rgba(193, 22, 22, 0.08)",
  },
  empty: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 22,
    padding: 20,
  },
  identityCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(193, 22, 22, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    padding: 18,
  },
  identityText: { flex: 1, gap: 5, minWidth: 0 },
  name: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 25,
    fontWeight: "700",
    lineHeight: 31,
  },
  nav: {
    alignItems: "center",
    borderBottomColor: "rgba(193, 22, 22, 0.12)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  navTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
  },
  page: { backgroundColor: authControlStyles.colors.paper, flex: 1 },
  role: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  section: { gap: 12 },
  store: {
    color: authControlStyles.colors.ink60,
    flexShrink: 1,
    fontFamily: "serif",
    fontSize: 14,
    lineHeight: 20,
  },
  storeRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  titleList: { gap: 9 },
});
