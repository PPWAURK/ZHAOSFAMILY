import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AuthUser } from "@zhao/types";
import type { UpdateMeRequest } from "@zhao/types";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import zhaoLogo from "@/features/auth/assets/logozhao正方形.jpg";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { LANGUAGE_OPTIONS } from "@/features/auth/authCopy";
import {
  DASHBOARD_COPY,
  DASHBOARD_MORE_NAV_GROUPS,
  DASHBOARD_PRIMARY_NAV,
  type DashboardMenuItem,
  type DashboardNavItem,
} from "@/features/dashboard/dashboardCopy";
import {
  fetchDashboardNewsPosts,
  type DashboardNewsPost,
} from "@/features/dashboard/dashboardNewsApi";
import { OrderModuleScreen } from "@/features/orders/OrderModuleScreen";
import { ORDER_COPY } from "@/features/orders/orderCopy";
import { ProfileScreen } from "@/features/profile/ProfileScreen";

type DashboardHomeScreenProps = {
  language: AuthLanguage;
  user: AuthUser;
  onChangeLanguage: (language: AuthLanguage) => void;
  onLogout: () => Promise<void>;
  onUpdateProfile: (input: UpdateMeRequest) => Promise<void>;
};

function resolveDisplayName(user: AuthUser, fallback: string): string {
  const composedName = [user.familyName, user.givenName].filter(Boolean).join(" ");

  return user.name?.trim() || composedName.trim() || user.email || fallback;
}

function formatDate(value: string): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function canSeeNavItem(
  item: DashboardNavItem | DashboardMenuItem,
  permissions: string[],
): boolean {
  return !item.permission || permissions.includes(item.permission);
}

function resolveDashboardEntryId(entryId: string): string {
  return entryId === "new-order" ? "orders" : entryId;
}

function isConnectedDashboardEntry(entryId: string): boolean {
  return entryId === "home" || entryId === "orders" || entryId === "profile";
}

export function DashboardHomeScreen({
  language,
  user,
  onChangeLanguage,
  onLogout,
  onUpdateProfile,
}: DashboardHomeScreenProps) {
  const copy = DASHBOARD_COPY[language];
  const orderCopy = ORDER_COPY[language];
  const [activeEntry, setActiveEntry] = useState("home");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [newsPosts, setNewsPosts] = useState<DashboardNewsPost[]>([]);
  const [newsError, setNewsError] = useState("");
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const displayName = resolveDisplayName(user, copy.greetingFallback);
  const moreNavLabel = DASHBOARD_PRIMARY_NAV.find((item) => item.id === "more")?.label[language];
  const permissions = user.permissions ?? [];
  const visibleMoreGroups = useMemo(
    () =>
      DASHBOARD_MORE_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canSeeNavItem(item, permissions)),
      })).filter((group) => group.items.length > 0),
    [permissions],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadNews(): Promise<void> {
      try {
        setIsLoadingNews(true);
        setNewsError("");
        const posts = await fetchDashboardNewsPosts();

        if (!isCancelled) {
          setNewsPosts(posts.slice(0, 8));
        }
      } catch {
        if (!isCancelled) {
          setNewsPosts([]);
          setNewsError(copy.newsError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingNews(false);
        }
      }
    }

    void loadNews();

    return () => {
      isCancelled = true;
    };
  }, [copy.newsError]);

  function handleEntryPress(item: DashboardNavItem): void {
    setActionMessage("");

    if (item.id === "more") {
      setIsMoreOpen(true);
      return;
    }

    const nextEntry = resolveDashboardEntryId(item.id);
    setActiveEntry(nextEntry);

    if (!isConnectedDashboardEntry(nextEntry)) {
      setActionMessage(copy.unavailable);
    }
  }

  function handleMoreItemPress(item: DashboardMenuItem): void {
    const nextEntry = resolveDashboardEntryId(item.id);

    setIsMoreOpen(false);
    setActiveEntry(nextEntry);
    setActionMessage(isConnectedDashboardEntry(nextEntry) ? "" : copy.unavailable);
  }

  async function handleLogoutPress(): Promise<void> {
    setIsMoreOpen(false);
    await onLogout();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            <View style={styles.brandLanguageRow}>
              <Image source={zhaoLogo} style={styles.topLogo} resizeMode="contain" />
              <View accessibilityLabel={copy.languageLabel} style={styles.languageRow}>
                {LANGUAGE_OPTIONS.map((option, index) => (
                  <View key={option.value} style={styles.languageItem}>
                    {index > 0 ? <Text style={styles.languageSep}>/</Text> : null}
                    <Pressable onPress={() => onChangeLanguage(option.value)}>
                      <Text
                        style={[
                          styles.languageText,
                          language === option.value ? styles.languageActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            {!isMoreOpen ? (
              <Pressable
                accessibilityLabel={moreNavLabel}
                accessibilityRole="button"
                style={styles.topMenuButton}
                onPress={() => setIsMoreOpen(true)}
              >
                <Ionicons
                  color={authControlStyles.colors.red}
                  name="menu-outline"
                  size={24}
                />
              </Pressable>
            ) : null}
          </View>

          {activeEntry === "orders" ? (
            <OrderModuleScreen
              language={language}
              storeName={user.store?.name || user.storeName || user.establishment || undefined}
            />
          ) : activeEntry === "profile" ? (
            <ProfileScreen
              language={language}
              user={user}
              onChangeLanguage={onChangeLanguage}
              onLogout={onLogout}
              onUpdateProfile={onUpdateProfile}
            />
          ) : (
            <>
              <View style={styles.intro}>
                <View style={styles.kickerRow}>
                  <View style={styles.kickerDot} />
                  <TrackingText color={authControlStyles.colors.red} size={10.5}>
                    {copy.greetingLabel}
                  </TrackingText>
                </View>
                <Text style={styles.title}>
                  {copy.greetingPrefix}
                  <Text style={styles.titleEm}>{displayName}</Text>
                  {copy.greetingSuffix}
                </Text>
                <Text style={styles.introText}>{copy.intro}</Text>
              </View>

              <View style={styles.profileStrip}>
                <View style={styles.profileItem}>
                  <TrackingText size={10}>{copy.storeLabel}</TrackingText>
                  <Text style={styles.profileValue}>
                    {user.store?.name || user.storeName || user.establishment || "-"}
                  </Text>
                </View>
                <View style={styles.profileItem}>
                  <TrackingText size={10}>{copy.roleLabel}</TrackingText>
                  <Text style={styles.profileValue}>
                    {user.jobRole || user.position || user.role || "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.newsHeader}>
                <TrackingText color={authControlStyles.colors.red} size={10.5}>
                  {copy.newsTitle}
                </TrackingText>
                <Text style={styles.newsSubtitle}>{copy.newsSubtitle}</Text>
              </View>

              <View style={styles.newsList}>
                {isLoadingNews ? (
                  <View style={styles.stateRow}>
                    <ActivityIndicator color={authControlStyles.colors.red} />
                    <Text style={styles.stateText}>{copy.loadingNews}</Text>
                  </View>
                ) : null}

                {!isLoadingNews && newsError ? (
                  <Text style={styles.stateText}>{newsError}</Text>
                ) : null}

                {!isLoadingNews && !newsError && newsPosts.length === 0 ? (
                  <Text style={styles.stateText}>{copy.emptyNews}</Text>
                ) : null}

                {!isLoadingNews && !newsError
                  ? newsPosts.map((post) => (
                      <View key={post.id} style={styles.newsCard}>
                        <View style={styles.newsMetaRow}>
                          <Text style={styles.newsMetaText}>{formatDate(post.createdAt)}</Text>
                          <Text style={styles.newsMetaText}>{post.visibility}</Text>
                        </View>
                        <Text style={styles.newsTitle}>{post.title}</Text>
                        <Text style={styles.newsSummary}>{post.summary}</Text>
                        <Text style={styles.newsAuthor}>
                          {post.authorName || "-"} · {post.restaurantName || "-"}
                        </Text>
                      </View>
                    ))
                  : null}
              </View>

              <View style={styles.quickSection}>
                <TrackingText color={authControlStyles.colors.red} size={10.5}>
                  {copy.quickActions}
                </TrackingText>
                <View style={styles.quickGrid}>
                  {DASHBOARD_PRIMARY_NAV.filter((item) => item.id !== "more").map((item) => (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.quickAction,
                        activeEntry === item.id ? styles.quickActionActive : null,
                      ]}
                      onPress={() => handleEntryPress(item)}
                    >
                      <Ionicons
                        color={authControlStyles.colors.red}
                        name={item.icon}
                        size={22}
                      />
                      <Text style={styles.quickText}>{item.label[language]}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {actionMessage ? <Text style={styles.actionMessage}>{actionMessage}</Text> : null}
            </>
          )}

        </ScrollView>

        {!isMoreOpen ? (
          <BlurView intensity={72} tint="light" style={styles.bottomNav}>
            <View style={styles.bottomNavHighlight} />
            <View style={styles.bottomNavDepth} />
            {DASHBOARD_PRIMARY_NAV.filter((item) => item.id !== "more").map((item) => {
              const isActive = activeEntry === item.id;
              const navColor = isActive
                ? authControlStyles.colors.red
                : "rgba(12, 12, 12, 0.44)";

              return (
                <Pressable
                  key={item.id}
                  accessibilityLabel={item.label[language]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  style={styles.bottomNavItem}
                  onPress={() => handleEntryPress(item)}
                >
                  <Ionicons color={navColor} name={item.icon} size={21} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.bottomNavLabel,
                      { color: navColor },
                      language === "zh" ? styles.bottomNavLabelZh : null,
                      language === "en" ? styles.bottomNavLabelEn : null,
                      language === "fr" ? styles.bottomNavLabelFr : null,
                      isActive ? styles.bottomNavLabelActive : null,
                    ]}
                  >
                    {item.label[language]}
                  </Text>
                  <View
                    style={[
                      styles.bottomNavActiveDot,
                      isActive ? styles.bottomNavActiveDotVisible : null,
                    ]}
                  />
                </Pressable>
              );
            })}
          </BlurView>
        ) : null}

        {activeEntry === "orders" ? (
          <View style={styles.orderJumpControls}>
            <Pressable
              accessibilityLabel={orderCopy.jumpTop}
              style={styles.orderJumpButton}
              onPress={() => scrollViewRef.current?.scrollTo({ animated: true, y: 0 })}
            >
              <Ionicons
                color={authControlStyles.colors.red}
                name="chevron-up-outline"
                size={20}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={orderCopy.jumpBottom}
              style={styles.orderJumpButton}
              onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              <Ionicons
                color={authControlStyles.colors.red}
                name="chevron-down-outline"
                size={20}
              />
            </Pressable>
          </View>
        ) : null}

        <Modal
          animationType="slide"
          presentationStyle="overFullScreen"
          transparent
          visible={isMoreOpen}
          onRequestClose={() => setIsMoreOpen(false)}
        >
          <View style={styles.sheetModalRoot}>
            <Pressable style={styles.sheetBackdrop} onPress={() => setIsMoreOpen(false)} />
            <SafeAreaView
              edges={["left", "right"]}
              pointerEvents="box-none"
              style={styles.sheetSafeArea}
            >
              <BlurView intensity={42} tint="light" style={styles.sheet}>
                <View style={styles.sheetSurface} />
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <View>
                    <TrackingText color={authControlStyles.colors.red} size={10}>
                      {copy.moreKicker}
                    </TrackingText>
                    <Text style={styles.sheetTitle}>{copy.moreTitle}</Text>
                  </View>
                  <Pressable style={styles.sheetClose} onPress={() => setIsMoreOpen(false)}>
                    <Text style={styles.sheetCloseText}>{copy.close}</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                  {visibleMoreGroups.map((group) => (
                    <View key={group.id} style={styles.moreGroup}>
                      <TrackingText color={authControlStyles.colors.red} size={10}>
                        {group.label[language]}
                      </TrackingText>
                      <View style={styles.moreList}>
                        {group.items.map((item) => (
                          <Pressable
                            key={item.id}
                            style={styles.moreItem}
                            onPress={() => handleMoreItemPress(item)}
                          >
                            <Text style={styles.moreIcon}>{item.icon}</Text>
                            <Text style={styles.moreText}>{item.label[language]}</Text>
                            <Text style={styles.moreArrow}>→</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <Pressable
                  accessibilityRole="button"
                  style={styles.sheetLogoutButton}
                  onPress={() => void handleLogoutPress()}
                >
                  <Ionicons
                    color={authControlStyles.colors.red}
                    name="log-out-outline"
                    size={18}
                  />
                  <Text style={styles.sheetLogoutText}>{copy.logout}</Text>
                </Pressable>
              </BlurView>
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionMessage: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  bottomNav: {
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderColor: authControlStyles.colors.red,
    borderWidth: 1.2,
    borderRadius: 30,
    bottom: 0,
    elevation: 24,
    flexDirection: "row",
    left: 12,
    minHeight: 80,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 7,
    position: "absolute",
    right: 12,
    shadowColor: authControlStyles.colors.red,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 34,
  },
  bottomNavDepth: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  bottomNavHighlight: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 36,
    height: 28,
    left: 26,
    position: "absolute",
    right: 26,
    top: 5,
  },
  bottomNavItem: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 62,
    position: "relative",
  },
  bottomNavActiveDot: {
    backgroundColor: "transparent",
    borderRadius: 3,
    bottom: 5,
    height: 6,
    position: "absolute",
    width: 6,
  },
  bottomNavActiveDotVisible: {
    backgroundColor: authControlStyles.colors.red,
  },
  bottomNavLabel: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    lineHeight: 13,
    maxWidth: 68,
    minHeight: 18,
    textAlign: "center",
    textTransform: "uppercase",
  },
  bottomNavLabelActive: {
    color: authControlStyles.colors.red,
    fontWeight: "700",
  },
  brandLanguageRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  bottomNavLabelZh: {
    fontSize: 12,
    letterSpacing: 0.4,
    lineHeight: 15,
  },
  bottomNavLabelEn: {
    fontSize: 10,
    letterSpacing: 0.3,
    lineHeight: 13,
    maxWidth: 76,
  },
  bottomNavLabelFr: {
    fontSize: 9,
    letterSpacing: 0.2,
    lineHeight: 13,
    maxWidth: 84,
  },
  intro: {
    gap: 10,
    paddingTop: 22,
  },
  introText: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 23,
  },
  kickerDot: {
    backgroundColor: authControlStyles.colors.red,
    height: 8,
    width: 8,
  },
  kickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  languageActive: {
    color: authControlStyles.colors.red,
  },
  languageItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  languageRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  languageSep: {
    color: authControlStyles.colors.ink20,
    fontFamily: "monospace",
    fontSize: 11,
  },
  languageText: {
    color: authControlStyles.colors.ink40,
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  moreArrow: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "700",
  },
  moreGroup: {
    gap: 10,
    marginTop: 22,
  },
  moreIcon: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    width: 24,
  },
  moreItem: {
    alignItems: "center",
    borderBottomColor: "rgba(193, 22, 22, 0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 50,
  },
  moreList: {
    borderTopColor: "rgba(193, 22, 22, 0.16)",
    borderTopWidth: 1,
  },
  moreText: {
    color: authControlStyles.colors.ink,
    flex: 1,
    fontFamily: "serif",
    fontSize: 17,
  },
  newsAuthor: {
    color: authControlStyles.colors.ink40,
    fontFamily: "serif",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  newsCard: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(193, 22, 22, 0.16)",
    borderWidth: 1,
    padding: 16,
  },
  newsHeader: {
    gap: 8,
    marginTop: 28,
  },
  newsList: {
    gap: 12,
    marginTop: 14,
  },
  newsMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  newsMetaText: {
    color: authControlStyles.colors.ink40,
    fontFamily: "monospace",
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  newsSubtitle: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 14,
    lineHeight: 21,
  },
  newsSummary: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },
  newsTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 21,
    fontWeight: "500",
    lineHeight: 26,
    marginTop: 10,
  },
  orderJumpButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(193, 22, 22, 0.26)",
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    shadowColor: authControlStyles.colors.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    width: 44,
  },
  orderJumpControls: {
    bottom: 104,
    gap: 8,
    position: "absolute",
    right: 18,
    zIndex: 8,
  },
  profileItem: {
    flex: 1,
    gap: 6,
  },
  profileStrip: {
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    marginTop: 22,
    padding: 14,
  },
  profileValue: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 20,
  },
  quickAction: {
    alignItems: "center",
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 72,
    justifyContent: "center",
    minWidth: "47%",
  },
  quickActionActive: {
    borderColor: "rgba(193, 22, 22, 0.36)",
    backgroundColor: "rgba(193, 22, 22, 0.06)",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  quickSection: {
    marginTop: 28,
  },
  quickText: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 15,
  },
  safeArea: {
    backgroundColor: authControlStyles.colors.paper,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 132,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sheet: {
    backgroundColor: "rgba(193, 22, 22, 0.07)",
    borderColor: "rgba(193, 22, 22, 0.22)",
    borderTopWidth: 1,
    borderWidth: 1,
    maxHeight: "78%",
    overflow: "hidden",
    paddingBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: authControlStyles.colors.red,
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    width: "100%",
  },
  sheetBackdrop: {
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheetClose: {
    borderColor: "rgba(193, 22, 22, 0.16)",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  sheetCloseText: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(193, 22, 22, 0.16)",
    height: 4,
    marginBottom: 18,
    width: 42,
  },
  sheetHeader: {
    alignItems: "flex-start",
    borderBottomColor: "rgba(193, 22, 22, 0.16)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 18,
  },
  sheetList: {
    flexShrink: 1,
  },
  sheetModalRoot: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetLogoutButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderColor: "rgba(193, 22, 22, 0.38)",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 48,
    borderRadius:46,
    marginBottom:20,
  },
  sheetLogoutText: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sheetSafeArea: {
    backgroundColor: "transparent",
    bottom: 0,
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
  },
  sheetSurface: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheetTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "500",
    lineHeight: 34,
    marginTop: 6,
  },
  shell: {
    flex: 1,
  },
  stateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  stateText: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "500",
    lineHeight: 40,
  },
  titleEm: {
    color: authControlStyles.colors.red,
    fontStyle: "italic",
    fontWeight: "400",
  },
  top: {
    alignItems: "center",
    borderBottomColor: authControlStyles.colors.red,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    minHeight: 34,
  },
  topLogo: {
    height: 32,
    width: 32,
  },
  topMenuButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderColor: "rgba(193, 22, 22, 0.18)",
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
});
