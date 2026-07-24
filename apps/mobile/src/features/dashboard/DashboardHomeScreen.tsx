import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { scaleStyles } from "@/lib/responsive";
import { useScreenName } from "@/lib/useScreenName";
import { useNotificationNavigation } from "@/lib/useNotificationNavigation";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  AuthUser,
  ChangePasswordRequest,
  DeleteAccountRequest,
  UpdateMeRequest,
} from "@zhao/types";
import { canSeeNavEntry } from "@zhao/utils";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { WebView } from "react-native-webview";
import { ProtectedScreen } from "@/components/ProtectedScreen";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { StoreGradeLeaderboard } from "@/features/dashboard/StoreGradeLeaderboard";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import { crossPlatformShadow } from "@/lib/platform";
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
  fetchDashboardNewsPost,
  fetchDashboardNewsPosts,
  type DashboardNewsPost,
} from "@/features/dashboard/dashboardNewsApi";
import { DashboardNewsBoard } from "@/features/dashboard/DashboardNewsBoard";
import {
  formatDashboardNewsDate as formatDate,
  isDashboardNewsSummaryDistinct,
  parseDashboardNewsImage as parseMarkdownImageLine,
  resolveNewsDeskCategory,
  stripDashboardNewsFormatting,
  type NewsDeskCategory,
} from "@/features/dashboard/dashboardNewsPresentation";
import { CaseSharesModuleScreen } from "@/features/case-shares/CaseSharesModuleScreen";
import { CASE_SHARES_COPY } from "@/features/case-shares/caseSharesCopy";
import { OrderModuleScreen } from "@/features/orders/OrderModuleScreen";
import { ORDER_COPY } from "@/features/orders/orderCopy";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { RecruitmentModuleScreen } from "@/features/recruitment/RecruitmentModuleScreen";
import { RecipeModuleScreen } from "@/features/recipes/RecipeModuleScreen";
import { StoresModuleScreen } from "@/features/stores/StoresModuleScreen";
import { TRAINING_COPY } from "@/features/training/trainingCopy";
import { TrainingHistoryView } from "@/features/training/TrainingHistoryView";
import { TrainingModuleScreen } from "@/features/training/TrainingModuleScreen";
import { TrainingTitleFrame } from "@/features/training/TrainingTitleFrame";
import { fetchTrainingMyTitles } from "@/features/training/trainingApi";
import type { TrainingTitle } from "@/features/training/trainingTypes";
import { WaitingQueueModuleScreen } from "@/features/waiting-queue/WaitingQueueModuleScreen";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";

type DashboardHomeScreenProps = {
  language: AuthLanguage;
  user: AuthUser;
  onChangeLanguage: (language: AuthLanguage) => void;
  onLogout: () => Promise<void>;
  onChangePassword: (input: ChangePasswordRequest) => Promise<void>;
  onUpdateProfile: (input: UpdateMeRequest) => Promise<void>;
  onDeleteAccount: (input: DeleteAccountRequest) => Promise<void>;
};

const PDF_LOADING_MIN_DURATION_MS = 2000;
const MAX_NEWS_PER_CATEGORY = 20;

function resolveDisplayName(user: AuthUser, fallback: string): string {
  const composedName = [user.familyName, user.givenName].filter(Boolean).join(" ");

  return user.name?.trim() || composedName.trim() || user.email || fallback;
}

function resolveDashboardUserCard(
  user: AuthUser,
  fallback: string,
): {
  avatar: string | null;
  displayName: string;
  initials: string;
  role: string;
  store: string;
} {
  const displayName = resolveDisplayName(user, fallback);
  const roleParts = Array.from(
    new Set(
      `${user.jobRole || user.position || user.role || ""}`
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
  const initials = displayName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    avatar: user.avatarUrl || user.avatar || null,
    displayName,
    initials,
    role: roleParts.join(" · ") || "-",
    store: user.store?.name || user.storeName || user.establishment || "-",
  };
}

function formatAttachmentSize(sizeBytes: number): string {
  if (!sizeBytes) return "-";
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function postMatchesSearch(post: DashboardNewsPost, searchTerm: string): boolean {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [post.title, post.summary, post.body, post.authorName, post.restaurantName, ...post.tags]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function isPdfAttachment(post: DashboardNewsPost): boolean {
  const attachment = post.attachment;

  if (!attachment) {
    return false;
  }

  return (
    attachment.mimeType === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf")
  );
}

function resolveDashboardEntryId(entryId: string): string {
  return entryId === "new-order" ? "orders" : entryId;
}

function isConnectedDashboardEntry(entryId: string): boolean {
  return (
    entryId === "home" ||
    entryId === "case-shares" ||
    entryId === "my-case-shares" ||
    entryId === "orders" ||
    entryId === "recipes" ||
    entryId === "profile" ||
    entryId === "recruitment-requests" ||
    entryId === "store-grade-ranking" ||
    entryId === "stores" ||
    entryId === "training" ||
    entryId === "training-records"
  );
}

export function DashboardHomeScreen({
  language,
  user,
  onChangeLanguage,
  onLogout,
  onChangePassword,
  onUpdateProfile,
  onDeleteAccount,
}: DashboardHomeScreenProps) {
  useScreenName("dashboard");
  const copy = DASHBOARD_COPY[language];
  const orderCopy = ORDER_COPY[language];
  const [activeEntry, setActiveEntry] = useState("home");

  // Route to the relevant module when the app is opened from a push tap.
  useNotificationNavigation((entry) => setActiveEntry(entry));
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  // The order module reports when its long product-selection view is active so
  // the scroll-to-top/bottom helpers only show there, not on the supplier list.
  const [isOrderProductView, setIsOrderProductView] = useState(false);
  const [caseSharePublishAction, setCaseSharePublishAction] = useState<(() => void) | null>(null);
  const [newsPosts, setNewsPosts] = useState<DashboardNewsPost[]>([]);
  const [newsError, setNewsError] = useState("");
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [newsSearchTerm, setNewsSearchTerm] = useState("");
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<NewsDeskCategory>("news");
  const [selectedNewsPost, setSelectedNewsPost] = useState<DashboardNewsPost | null>(null);
  const [pdfPreviewPost, setPdfPreviewPost] = useState<DashboardNewsPost | null>(null);
  const [isLoadingPdfPreview, setIsLoadingPdfPreview] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState("");
  const [isLoadingSelectedNews, setIsLoadingSelectedNews] = useState(false);
  const [readerError, setReaderError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [equippedTitle, setEquippedTitle] = useState<TrainingTitle | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const pdfLoadingStartedAtRef = useRef(0);
  const pdfLoadingTokenRef = useRef(0);
  const [newsCarouselIndex, setNewsCarouselIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  // Safe-area insets read here (outside the Modal) — RN Modal renders in a
  // separate native window where SafeAreaView resolves insets to 0.
  const insets = useSafeAreaInsets();

  const handleCaseSharePublishActionChange = useCallback((action: (() => void) | null): void => {
    setCaseSharePublishAction(() => action);
  }, []);

  // Keep the mobile trigger on the right while matching the Web drawer styling.
  const [isMoreRendered, setIsMoreRendered] = useState(false);
  const moreDrawerProgress = useRef(new Animated.Value(0)).current;
  const moreDrawerWidth = Math.min(360, Math.round(screenWidth * 0.88));
  const moreDrawerTranslateX = moreDrawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [moreDrawerWidth, 0],
  });

  useEffect(() => {
    if (isMoreOpen) {
      setIsMoreRendered(true);
      Animated.timing(moreDrawerProgress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(moreDrawerProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMoreRendered(false);
      }
    });
  }, [isMoreOpen, moreDrawerProgress]);

  const displayName = resolveDisplayName(user, copy.greetingFallback);
  const userCard = useMemo(
    () => resolveDashboardUserCard(user, copy.greetingFallback),
    [copy.greetingFallback, user],
  );

  useEffect(() => {
    let isActive = true;

    async function loadEquippedTitle(): Promise<void> {
      if (!isMoreOpen) return;

      try {
        const myTitles = await fetchTrainingMyTitles();
        if (isActive) setEquippedTitle(myTitles.equippedTitle ?? null);
      } catch {
        if (isActive) setEquippedTitle(null);
      }
    }

    void loadEquippedTitle();

    return () => {
      isActive = false;
    };
  }, [isMoreOpen, user.id]);
  const moreNavLabel = DASHBOARD_PRIMARY_NAV.find((item) => item.id === "more")?.label[language];
  const visiblePrimaryNav = useMemo(
    () => DASHBOARD_PRIMARY_NAV.filter((item) => canSeeNavEntry(user, item)),
    [user],
  );
  const visibleMoreGroups = useMemo(
    () =>
      DASHBOARD_MORE_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canSeeNavEntry(user, item)),
      })).filter((group) => group.items.length > 0),
    [user],
  );
  const visibleNewsPosts = useMemo(
    () =>
      newsPosts
        .filter((post) => {
          const matchesCategory = resolveNewsDeskCategory(post.category) === selectedNewsCategory;

          return matchesCategory && postMatchesSearch(post, newsSearchTerm);
        })
        .slice(0, MAX_NEWS_PER_CATEGORY),
    [newsPosts, newsSearchTerm, selectedNewsCategory],
  );
  useEffect(() => {
    let isCancelled = false;

    async function loadNews(): Promise<void> {
      try {
        setIsLoadingNews(true);
        setNewsError("");
        const posts = await fetchDashboardNewsPosts();

        if (!isCancelled) {
          setNewsPosts(posts);
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

  useEffect(() => {
    setNewsCarouselIndex(0);
  }, [newsSearchTerm, selectedNewsCategory]);

  function handleEntryPress(item: DashboardNavItem): void {
    setActionMessage("");

    if (item.id === "more") {
      setIsMoreOpen(true);
      return;
    }

    const nextEntry = resolveDashboardEntryId(item.id);
    setActiveEntry(nextEntry);
    scrollViewRef.current?.scrollTo({ animated: false, y: 0 });

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

  async function handleOpenNewsPost(post: DashboardNewsPost): Promise<void> {
    setReaderError("");
    setSelectedNewsPost(post);
    setIsLoadingSelectedNews(true);

    try {
      const nextPost = await fetchDashboardNewsPost(post.id);
      setSelectedNewsPost(nextPost ?? post);
    } catch {
      setReaderError(copy.readerError);
    } finally {
      setIsLoadingSelectedNews(false);
    }
  }

  function handleCloseNewsReader(): void {
    setSelectedNewsPost(null);
    setReaderError("");
    setIsLoadingSelectedNews(false);
  }

  async function handleOpenAttachment(post: DashboardNewsPost): Promise<void> {
    const attachmentUrl = post.attachment?.href;
    if (!attachmentUrl) {
      setReaderError(copy.newsAttachmentOpenError);
      return;
    }

    if (isPdfAttachment(post)) {
      setPdfPreviewError("");
      setIsLoadingPdfPreview(true);
      pdfLoadingStartedAtRef.current = Date.now();
      pdfLoadingTokenRef.current += 1;
      setSelectedNewsPost(null);
      setReaderError("");
      setIsLoadingSelectedNews(false);
      setTimeout(() => setPdfPreviewPost(post), 120);
      return;
    }

    try {
      await Linking.openURL(attachmentUrl);
    } catch {
      setReaderError(copy.newsAttachmentOpenError);
    }
  }

  function handleClosePdfPreview(): void {
    setPdfPreviewPost(null);
    setIsLoadingPdfPreview(false);
    setPdfPreviewError("");
    pdfLoadingStartedAtRef.current = 0;
    pdfLoadingTokenRef.current += 1;
  }

  function finishPdfLoading(onFinish?: () => void): void {
    const token = pdfLoadingTokenRef.current;
    const elapsed = Date.now() - pdfLoadingStartedAtRef.current;
    const remaining = Math.max(0, PDF_LOADING_MIN_DURATION_MS - elapsed);

    setTimeout(() => {
      if (token !== pdfLoadingTokenRef.current) {
        return;
      }

      setIsLoadingPdfPreview(false);
      onFinish?.();
    }, remaining);
  }

  function moveNewsPost(direction: "previous" | "next"): void {
    setNewsCarouselIndex((currentIndex) => {
      if (direction === "next") {
        return Math.min(currentIndex + 1, visibleNewsPosts.length - 1);
      }

      return Math.max(currentIndex - 1, 0);
    });
  }

  function renderNewsReaderBody(post: DashboardNewsPost): ReactNode {
    const body = post.body || post.summary;

    return body.split("\n").map((line, index) => {
      const image = parseMarkdownImageLine(line.trim());
      const key = `${index}-${line.slice(0, 12)}`;

      if (image) {
        return (
          <Pressable
            key={key}
            accessibilityRole="imagebutton"
            accessibilityLabel={image.alt}
            onPress={() => void Linking.openURL(image.src)}
          >
            <Image
              source={{ uri: image.src }}
              resizeMode="contain"
              style={styles.readerBodyImage}
            />
          </Pressable>
        );
      }

      return (
        <Text key={key} style={styles.readerBodyText}>
          {stripDashboardNewsFormatting(line) || " "}
        </Text>
      );
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="never"
          nestedScrollEnabled
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

            <View style={styles.topActions}>
              <NotificationCenter
                language={language}
                onOpenEntry={(entry) => setActiveEntry(entry)}
              />
              {!isMoreOpen ? (
                <Pressable
                  accessibilityLabel={moreNavLabel}
                  accessibilityRole="button"
                  style={styles.topMenuButton}
                  onPress={() => setIsMoreOpen(true)}
                >
                  <Ionicons color={authControlStyles.colors.red} name="menu-outline" size={24} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {activeEntry === "orders" ? (
            <OrderModuleScreen
              language={language}
              storeName={user.store?.name || user.storeName || user.establishment || undefined}
              onProductViewChange={setIsOrderProductView}
            />
          ) : activeEntry === "stores" ? (
            <StoresModuleScreen language={language} user={user} />
          ) : activeEntry === "store-grade-ranking" ? (
            <StoreGradeLeaderboard language={language} />
          ) : activeEntry === "profile" ? (
            <ProfileScreen
              language={language}
              user={user}
              onChangeLanguage={onChangeLanguage}
              onLogout={onLogout}
              onChangePassword={onChangePassword}
              onUpdateProfile={onUpdateProfile}
              onDeleteAccount={onDeleteAccount}
            />
          ) : activeEntry === "recruitment-requests" ? (
            <RecruitmentModuleScreen language={language} />
          ) : activeEntry === "recipes" ? (
            <RecipeModuleScreen language={language} user={user} />
          ) : activeEntry === "case-shares" ? (
            <CaseSharesModuleScreen
              language={language}
              mode="public"
              onRegisterPublishAction={handleCaseSharePublishActionChange}
              onOpenMyCases={() => setActiveEntry("my-case-shares")}
            />
          ) : activeEntry === "my-case-shares" ? (
            <CaseSharesModuleScreen
              language={language}
              mode="mine"
              onRegisterPublishAction={handleCaseSharePublishActionChange}
              onOpenMyCases={() => setActiveEntry("my-case-shares")}
            />
          ) : activeEntry === "waiting-queue" ? (
            <WaitingQueueModuleScreen language={language} />
          ) : activeEntry === "training" ? (
            <TrainingModuleScreen language={language} user={user} />
          ) : activeEntry === "training-records" ? (
            <TrainingHistoryView copy={TRAINING_COPY[language]} language={language} />
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
              </View>

              <DashboardNewsBoard
                activeCategory={selectedNewsCategory}
                activeIndex={newsCarouselIndex}
                copy={copy}
                error={newsError}
                isLoading={isLoadingNews}
                posts={newsPosts}
                searchTerm={newsSearchTerm}
                visiblePosts={visibleNewsPosts}
                onMove={moveNewsPost}
                onOpenPost={(post) => void handleOpenNewsPost(post)}
                onSearchChange={setNewsSearchTerm}
                onSelectCategory={setSelectedNewsCategory}
              />

              <Modal
                animationType="slide"
                presentationStyle="overFullScreen"
                transparent
                visible={!!selectedNewsPost}
                onRequestClose={handleCloseNewsReader}
              >
                <View style={styles.readerModalRoot}>
                  <Pressable style={styles.readerBackdrop} onPress={handleCloseNewsReader} />
                  <SafeAreaView
                    edges={["left", "right"]}
                    pointerEvents="box-none"
                    style={styles.readerSafeArea}
                  >
                    {selectedNewsPost ? (
                      <BlurView intensity={34} tint="light" style={styles.readerSheet}>
                        <View style={styles.sheetSurface} />
                        <View style={styles.sheetHandle} />
                        <View style={styles.newsMetaRow}>
                          <Text style={styles.newsMetaText}>
                            {
                              copy.newsCategories[
                                resolveNewsDeskCategory(selectedNewsPost.category)
                              ]
                            }
                          </Text>
                          <Pressable
                            style={styles.readerCloseButton}
                            onPress={handleCloseNewsReader}
                          >
                            <Text style={styles.sheetCloseText}>{copy.newsReaderClose}</Text>
                          </Pressable>
                        </View>
                        <ScrollView
                          showsVerticalScrollIndicator={false}
                          style={styles.readerScroll}
                        >
                          <Text style={styles.readerTitle}>
                            {stripDashboardNewsFormatting(selectedNewsPost.title)}
                          </Text>
                          {isDashboardNewsSummaryDistinct(
                            selectedNewsPost.summary,
                            selectedNewsPost.body,
                          ) ? (
                            <Text style={styles.readerSummary}>
                              {stripDashboardNewsFormatting(
                                selectedNewsPost.summary,
                              )}
                            </Text>
                          ) : null}
                          <View style={styles.readerMetaGrid}>
                            <Text style={styles.newsMetaText}>
                              {formatDate(selectedNewsPost.createdAt)}
                            </Text>
                            <Text style={styles.newsMetaText}>
                              {selectedNewsPost.authorName || "-"} ·{" "}
                              {selectedNewsPost.restaurantName || "-"}
                            </Text>
                          </View>
                          {isLoadingSelectedNews ? (
                            <View style={styles.stateRow}>
                              <ZhaoLoadingIndicator label={copy.newsReaderLoading} />
                            </View>
                          ) : null}
                          {readerError ? <Text style={styles.stateText}>{readerError}</Text> : null}
                          {selectedNewsPost.attachment?.href ? (
                            <Pressable
                              style={styles.attachmentCard}
                              onPress={() => void handleOpenAttachment(selectedNewsPost)}
                            >
                              <View style={styles.attachmentBody}>
                                <Text style={styles.newsMetaText}>{copy.newsAttachment}</Text>
                                <Text style={styles.attachmentName}>
                                  {selectedNewsPost.attachment.name || "-"}
                                </Text>
                                <Text style={styles.stateText}>
                                  {formatAttachmentSize(selectedNewsPost.attachment.sizeBytes)}
                                </Text>
                              </View>
                              <Text style={styles.newsReadMore}>{copy.newsOpenAttachment}</Text>
                            </Pressable>
                          ) : null}
                          <View style={styles.readerBody}>
                            {renderNewsReaderBody(selectedNewsPost)}
                          </View>
                          {selectedNewsPost.tags.length > 0 ? (
                            <View style={styles.newsTagRow}>
                              {selectedNewsPost.tags.map((tag) => (
                                <Text key={tag} style={styles.newsTag}>
                                  #{tag}
                                </Text>
                              ))}
                            </View>
                          ) : null}
                        </ScrollView>
                      </BlurView>
                    ) : null}
                  </SafeAreaView>
                </View>
              </Modal>

              <Modal
                animationType="slide"
                presentationStyle="overFullScreen"
                transparent
                visible={!!pdfPreviewPost}
                onRequestClose={handleClosePdfPreview}
              >
                <View style={styles.pdfModalRoot}>
                  <View style={styles.pdfPanel}>
                    <View style={styles.pdfHeader}>
                      <View style={styles.attachmentBody}>
                        <Text style={styles.newsMetaText}>{copy.newsPdfPreview}</Text>
                        <Text style={styles.attachmentName}>
                          {pdfPreviewPost?.attachment?.name || "-"}
                        </Text>
                      </View>
                      <Pressable style={styles.readerCloseButton} onPress={handleClosePdfPreview}>
                        <Text style={styles.sheetCloseText}>{copy.newsReaderClose}</Text>
                      </Pressable>
                    </View>
                    <View style={styles.pdfViewer}>
                      {pdfPreviewPost?.attachment?.href ? (
                        <ProtectedScreen screenName="dashboard-home-pdf-preview">
                          <WebView
                            originWhitelist={["*"]}
                            source={{ uri: pdfPreviewPost.attachment.href }}
                            startInLoadingState
                            style={styles.pdfWebView}
                            onError={() => {
                              finishPdfLoading(() => setPdfPreviewError(copy.newsPdfPreviewError));
                            }}
                            onLoadEnd={() => finishPdfLoading()}
                          />
                        </ProtectedScreen>
                      ) : null}
                      {isLoadingPdfPreview ? (
                        <View style={styles.pdfLoadingOverlay}>
                          <ZhaoLoadingIndicator
                            label={copy.newsPdfPreviewLoading}
                            variant="overlay"
                          />
                        </View>
                      ) : null}
                      {pdfPreviewError ? (
                        <View style={styles.pdfLoadingOverlay}>
                          <Text style={styles.pdfLoadingText}>{pdfPreviewError}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Modal>
              {actionMessage ? <Text style={styles.actionMessage}>{actionMessage}</Text> : null}
            </>
          )}
        </ScrollView>

        {!isMoreOpen ? (
          <BlurView intensity={80} tint="light" style={styles.bottomNav}>
            <View style={styles.bottomNavDepth} />
            {visiblePrimaryNav
              .filter((item) => item.id !== "more")
              .map((item) => {
                const isActive = activeEntry === item.id;
                const navColor = isActive ? authControlStyles.colors.red : "rgba(12, 12, 12, 0.44)";
                const navLabel = item.compactLabel?.[language] ?? item.label[language];

                return (
                  <Pressable
                    key={item.id}
                    accessibilityLabel={item.label[language]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    style={styles.bottomNavItem}
                    onPress={() => handleEntryPress(item)}
                  >
                    <View style={styles.bottomNavIconSlot}>
                      <Ionicons color={navColor} name={item.icon} size={22} />
                    </View>
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
                      {navLabel}
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

        {activeEntry === "orders" && isOrderProductView ? (
          <View style={styles.orderJumpControls}>
            <Pressable
              accessibilityLabel={orderCopy.jumpTop}
              style={styles.orderJumpButton}
              onPress={() => scrollViewRef.current?.scrollTo({ animated: true, y: 0 })}
            >
              <Ionicons color={authControlStyles.colors.red} name="chevron-up-outline" size={20} />
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

        {(activeEntry === "case-shares" || activeEntry === "my-case-shares") &&
        caseSharePublishAction ? (
          <Pressable
            accessibilityLabel={CASE_SHARES_COPY[language].publish}
            accessibilityRole="button"
            style={styles.caseSharePublishButton}
            onPress={caseSharePublishAction}
          >
            <Ionicons color="#ffffff" name="add" size={30} />
          </Pressable>
        ) : null}

        <Modal
          animationType="none"
          presentationStyle="overFullScreen"
          transparent
          visible={isMoreRendered}
          onRequestClose={() => setIsMoreOpen(false)}
        >
          <View style={styles.sheetModalRoot}>
            <Pressable style={styles.sheetBackdrop} onPress={() => setIsMoreOpen(false)} />
            <Animated.View
              style={[
                styles.sheetDrawer,
                { width: moreDrawerWidth, transform: [{ translateX: moreDrawerTranslateX }] },
              ]}
            >
              <View style={styles.sheet}>
                <View
                  style={[
                    styles.sheetContent,
                    {
                      paddingTop: insets.top,
                      paddingBottom: insets.bottom,
                    },
                  ]}
                >
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetBrand}>
                      <Text style={styles.sheetBrandBold}>ZHAO</Text> / FAMILY
                    </Text>
                    <Pressable style={styles.sheetClose} onPress={() => setIsMoreOpen(false)}>
                      <Text style={styles.sheetCloseText}>{copy.close} ×</Text>
                    </Pressable>
                  </View>

                  <View style={styles.sheetUserCard}>
                    <View style={styles.sheetUserBody}>
                      <View style={styles.sheetUserAvatar}>
                        {userCard.avatar ? (
                          <Image
                            source={{ uri: userCard.avatar }}
                            style={styles.sheetUserAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.sheetUserInitials}>{userCard.initials || "Z"}</Text>
                        )}
                      </View>
                      <View style={styles.sheetUserIdentity}>
                        <Text style={styles.sheetUserName}>{userCard.displayName}</Text>
                        {equippedTitle ? (
                          <TrainingTitleFrame compact title={equippedTitle} language={language} />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.sheetUserMeta}>
                      <View style={styles.sheetUserMetaRow}>
                        <Text style={styles.sheetUserMetaLabel}>{copy.storeLabel}</Text>
                        <Text style={styles.sheetUserMetaValue}>{userCard.store}</Text>
                      </View>
                      <View style={styles.sheetUserMetaRow}>
                        <Text style={styles.sheetUserMetaLabel}>{copy.roleLabel}</Text>
                        <Text style={styles.sheetUserMetaValue}>{userCard.role}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.sheetMenuIntro}>
                    <View style={styles.sheetUserKickerRow}>
                      <View style={styles.sheetUserKickerDot} />
                      <TrackingText color={authControlStyles.colors.red} size={10}>
                        {copy.moreKicker}
                      </TrackingText>
                    </View>
                    <Text style={styles.sheetMenuTitle}>{copy.moreTitle}</Text>
                  </View>

                  <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                    {visibleMoreGroups.map((group) => (
                      <View key={group.id} style={styles.moreGroup}>
                        <View style={styles.moreGroupLabelRow}>
                          <View style={styles.moreGroupLabelDash} />
                          <TrackingText
                            color={authControlStyles.colors.red}
                            size={10}
                            style={styles.moreGroupLabel}
                          >
                            {group.label[language]}
                          </TrackingText>
                          <View style={styles.moreGroupLabelLine} />
                        </View>
                        <View style={styles.moreList}>
                          {group.items.map((item, index) => (
                            <Pressable
                              key={item.id}
                              style={styles.moreItem}
                              onPress={() => handleMoreItemPress(item)}
                            >
                              <Text style={styles.moreIndex}>
                                {String(index + 1).padStart(2, "0")}
                              </Text>
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
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create(
  scaleStyles({
    actionMessage: {
      color: authControlStyles.colors.ink60,
      fontFamily: "serif",
      fontSize: 13,
      lineHeight: 20,
      marginTop: 12,
    },
    bottomNav: {
      backgroundColor: Platform.select({
        ios: "rgba(255, 255, 255, 0.62)",
        default: "rgba(255, 255, 255, 0.88)",
      }),
      borderColor: authControlStyles.colors.red,
      borderWidth: 1,
      bottom: 0,
      flexDirection: "row",
      overflow: "hidden",
      paddingHorizontal: 6,
      position: "absolute",
      minHeight: 62,
      borderRadius: 20,
      left: 20,
      right: 20,
      ...crossPlatformShadow({
        color: authControlStyles.colors.red,
        offset: { width: 0, height: 18 },
        opacity: 0.2,
        radius: 34,
        elevation: 24,
      }),
    },
    bottomNavDepth: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    bottomNavItem: {
      alignItems: "center",
      flexBasis: 0,
      flexGrow: 1,
      flexShrink: 1,
      gap: 4,
      justifyContent: "center",
      minHeight: 68,
      minWidth: 0,
      position: "relative",
    },
    bottomNavIconSlot: {
      alignItems: "center",
      height: 24,
      justifyContent: "center",
      width: 28,
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
      fontSize: 11,
      letterSpacing: 0.2,
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
      fontSize: 16,
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
      marginTop: 16,
    },
    moreGroupLabel: {
      fontWeight: "700",
    },
    moreGroupLabelDash: {
      backgroundColor: authControlStyles.colors.red,
      height: 2,
      width: 18,
    },
    moreGroupLabelLine: {
      backgroundColor: "rgba(193, 22, 22, 0.18)",
      flex: 1,
      height: 1,
    },
    moreGroupLabelRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      marginBottom: 6,
    },
    moreIndex: {
      backgroundColor: "rgba(193, 22, 22, 0.06)",
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.6,
      minWidth: 34,
      paddingHorizontal: 5,
      paddingVertical: 2,
      textAlign: "center",
    },
    moreItem: {
      alignItems: "center",
      borderBottomColor: "rgba(193, 22, 22, 0.08)",
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 14,
      minHeight: 50,
      paddingHorizontal: 10,
      paddingVertical: 13,
    },
    moreList: {
      gap: 0,
    },
    moreText: {
      color: authControlStyles.colors.ink,
      flex: 1,
      fontFamily: "serif",
      fontSize: 17,
    },
    attachmentBody: {
      flex: 1,
      gap: 5,
    },
    attachmentCard: {
      alignItems: "center",
      backgroundColor: "rgba(193, 22, 22, 0.05)",
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      marginTop: 18,
      padding: 14,
    },
    attachmentName: {
      color: authControlStyles.colors.ink,
      fontFamily: "serif",
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 21,
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
    newsReadMore: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    newsTag: {
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      color: authControlStyles.colors.red,
      fontSize: 12,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    newsTagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 18,
    },
    pdfHeader: {
      alignItems: "center",
      borderBottomColor: "rgba(193, 22, 22, 0.14)",
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 14,
      justifyContent: "space-between",
      padding: 16,
    },
    pdfLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      gap: 18,
      justifyContent: "center",
      padding: 24,
    },
    pdfLoadingText: {
      color: authControlStyles.colors.red,
      fontFamily: "serif",
      fontSize: 22,
      fontWeight: "600",
      lineHeight: 30,
      textAlign: "center",
    },
    pdfModalRoot: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(10, 10, 10, 0.22)",
      justifyContent: "flex-end",
    },
    pdfPanel: {
      backgroundColor: "#ffffff",
      borderColor: "rgba(193, 22, 22, 0.22)",
      borderTopWidth: 1,
      height: "88%",
      overflow: "hidden",
      width: "100%",
    },
    pdfViewer: {
      flex: 1,
      position: "relative",
    },
    pdfWebView: {
      flex: 1,
    },
    readerBackdrop: {
      backgroundColor: "rgba(10, 10, 10, 0.18)",
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    readerBody: {
      gap: 8,
      marginTop: 18,
    },
    readerBodyImage: {
      backgroundColor: "rgba(255, 255, 255, 0.72)",
      borderColor: "rgba(193, 22, 22, 0.16)",
      borderWidth: 1,
      height: 260,
      marginVertical: 8,
      width: "100%",
    },
    readerBodyText: {
      color: authControlStyles.colors.ink,
      fontSize: 16,
      lineHeight: 25,
    },
    readerMetaGrid: {
      borderColor: "rgba(193, 22, 22, 0.12)",
      borderWidth: 1,
      gap: 8,
      marginTop: 16,
      padding: 12,
    },
    readerModalRoot: {
      ...StyleSheet.absoluteFillObject,
      flex: 1,
      justifyContent: "flex-end",
    },
    readerSafeArea: {
      backgroundColor: "transparent",
      bottom: 0,
      justifyContent: "flex-end",
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
      width: "100%",
    },
    readerScroll: {
      flexShrink: 1,
    },
    readerSheet: {
      backgroundColor: Platform.select({
        ios: "rgba(255, 255, 255, 0.88)",
        default: "rgba(255, 255, 255, 0.96)",
      }),
      borderColor: "rgba(193, 22, 22, 0.22)",
      borderTopWidth: 1,
      maxHeight: "82%",
      overflow: "hidden",
      paddingBottom: 18,
      paddingHorizontal: 20,
      paddingTop: 10,
      ...crossPlatformShadow({
        color: authControlStyles.colors.red,
        offset: { width: 0, height: -16 },
        opacity: 0.14,
        radius: 30,
        elevation: 24,
      }),
      width: "100%",
    },
    readerSummary: {
      color: authControlStyles.colors.ink60,
      fontSize: 16,
      lineHeight: 24,
      marginTop: 10,
    },
    readerTitle: {
      color: authControlStyles.colors.ink,
      fontSize: 30,
      fontWeight: "600",
      lineHeight: 36,
      marginTop: 16,
    },
    caseSharePublishButton: {
      alignItems: "center",
      backgroundColor: authControlStyles.colors.red,
      borderColor: "#ffffff",
      borderRadius: 29,
      borderWidth: 2,
      bottom: 104,
      height: 58,
      justifyContent: "center",
      position: "absolute",
      right: 18,
      zIndex: 8,
      ...crossPlatformShadow({
        color: authControlStyles.colors.red,
        offset: { width: 0, height: 8 },
        opacity: 0.24,
        radius: 16,
        elevation: 12,
      }),
      width: 58,
    },
    orderJumpButton: {
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      borderColor: "rgba(193, 22, 22, 0.26)",
      borderWidth: 1,
      height: 44,
      justifyContent: "center",
      ...crossPlatformShadow({
        color: authControlStyles.colors.red,
        offset: { width: 0, height: 8 },
        opacity: 0.12,
        radius: 18,
        elevation: 12,
      }),
      width: 44,
    },
    orderJumpControls: {
      bottom: 104,
      gap: 8,
      position: "absolute",
      right: 18,
      zIndex: 8,
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
      backgroundColor: authControlStyles.colors.paper,
      borderLeftColor: authControlStyles.colors.red,
      borderLeftWidth: 1,
      flex: 1,
      overflow: "hidden",
      ...crossPlatformShadow({
        color: authControlStyles.colors.red,
        offset: { width: 0, height: 24 },
        opacity: 0.18,
        radius: 48,
        elevation: 24,
      }),
      width: "100%",
    },
    sheetBackdrop: {
      backgroundColor: "rgba(10, 10, 10, 0.28)",
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetBrand: {
      color: authControlStyles.colors.ink40,
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: "500",
      letterSpacing: 1.8,
      textTransform: "uppercase",
    },
    sheetBrandBold: {
      color: authControlStyles.colors.ink,
      fontWeight: "700",
    },
    sheetClose: {
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 28,
      paddingHorizontal: 10,
    },
    sheetCloseText: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.1,
    },
    readerCloseButton: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(193, 22, 22, 0.18)",
      backgroundColor: "rgba(255,255,255,0.25)",
      minHeight: 34,
      paddingHorizontal: 14,
    },
    sheetHandle: {
      alignSelf: "center",
      backgroundColor: "rgba(193, 22, 22, 0.16)",
      height: 4,
      marginBottom: 18,
      width: 42,
    },
    sheetHeader: {
      alignItems: "center",
      borderBottomColor: "rgba(193, 22, 22, 0.16)",
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: 16,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    sheetList: {
      flex: 1,
      paddingHorizontal: 24,
    },
    sheetModalRoot: {
      ...StyleSheet.absoluteFillObject,
      flex: 1,
    },
    sheetLogoutButton: {
      alignItems: "center",
      borderTopColor: "rgba(193, 22, 22, 0.18)",
      borderTopWidth: 1,
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
      marginTop: "auto",
      minHeight: 54,
      paddingHorizontal: 24,
    },
    sheetLogoutText: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 2.2,
      textTransform: "uppercase",
    },
    sheetContent: {
      flex: 1,
    },
    sheetDrawer: {
      bottom: 0,
      maxWidth: "100%",
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetSurface: {
      backgroundColor: Platform.select({
        ios: "rgba(255, 255, 255, 0.5)",
        default: "transparent",
      }),
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetUserAvatar: {
      alignItems: "center",
      backgroundColor: "rgba(193, 22, 22, 0.06)",
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      height: 64,
      justifyContent: "center",
      overflow: "hidden",
      width: 64,
    },
    sheetUserAvatarImage: {
      height: "100%",
      width: "100%",
    },
    sheetUserBody: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 14,
    },
    sheetUserCard: {
      borderBottomColor: "rgba(193, 22, 22, 0.18)",
      borderBottomWidth: 1,
      gap: 16,
      paddingBottom: 20,
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    sheetUserIdentity: {
      flex: 1,
      gap: 7,
      minWidth: 0,
    },
    sheetUserInitials: {
      color: authControlStyles.colors.red,
      fontFamily: "serif",
      fontSize: 22,
      fontWeight: "600",
      letterSpacing: 0.8,
    },
    sheetUserKickerDot: {
      backgroundColor: authControlStyles.colors.red,
      height: 8,
      width: 8,
    },
    sheetUserKickerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    sheetMenuIntro: {
      gap: 8,
      paddingBottom: 2,
      paddingHorizontal: 24,
      paddingTop: 18,
    },
    sheetMenuTitle: {
      color: authControlStyles.colors.ink,
      fontFamily: "serif",
      fontSize: 20,
      fontWeight: "700",
      lineHeight: 25,
    },
    sheetUserMeta: {
      borderTopColor: "rgba(193, 22, 22, 0.08)",
      borderTopWidth: 1,
      flexDirection: "row",
      gap: 10,
      paddingTop: 14,
    },
    sheetUserMetaLabel: {
      color: authControlStyles.colors.red,
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 1.8,
      textTransform: "uppercase",
    },
    sheetUserMetaRow: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },
    sheetUserMetaValue: {
      color: authControlStyles.colors.ink,
      fontFamily: "serif",
      fontSize: 14,
      lineHeight: 19,
    },
    sheetUserName: {
      color: authControlStyles.colors.ink,
      fontFamily: "serif",
      fontSize: 23,
      fontWeight: "500",
      lineHeight: 27,
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
    topActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
  }),
);
