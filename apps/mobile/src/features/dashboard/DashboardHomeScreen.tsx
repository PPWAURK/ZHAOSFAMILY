import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { scaleStyles } from "@/lib/responsive";
import { useNotificationNavigation } from "@/lib/useNotificationNavigation";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser, ChangePasswordRequest, UpdateMeRequest } from "@zhao/types";
import { canSeeNavEntry } from "@zhao/utils";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { WebView } from "react-native-webview";
import { ProtectedScreen } from "@/components/ProtectedScreen";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { StoreScoreLeaderboard } from "@/features/dashboard/StoreScoreLeaderboard";
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
import { OrderModuleScreen } from "@/features/orders/OrderModuleScreen";
import { ORDER_COPY } from "@/features/orders/orderCopy";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { RecruitmentModuleScreen } from "@/features/recruitment/RecruitmentModuleScreen";
import { StoresModuleScreen } from "@/features/stores/StoresModuleScreen";
import { TrainingModuleScreen } from "@/features/training/TrainingModuleScreen";

type DashboardHomeScreenProps = {
  language: AuthLanguage;
  user: AuthUser;
  onChangeLanguage: (language: AuthLanguage) => void;
  onLogout: () => Promise<void>;
  onChangePassword: (input: ChangePasswordRequest) => Promise<void>;
  onUpdateProfile: (input: UpdateMeRequest) => Promise<void>;
};

type NewsDeskCategory = "news" | "congrats" | "issues";

const NEWS_CATEGORY_FILTERS: NewsDeskCategory[] = ["news", "congrats", "issues"];
const PDF_LOADING_MIN_DURATION_MS = 2000;

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

function formatAttachmentSize(sizeBytes: number): string {
  if (!sizeBytes) return "-";
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} KB`;

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function postMatchesSearch(post: DashboardNewsPost, searchTerm: string): boolean {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [
    post.title,
    post.summary,
    post.body,
    post.authorName,
    post.restaurantName,
    ...post.tags,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function resolveNewsDeskCategory(category: string): NewsDeskCategory {
  if (category === "people") return "congrats";
  if (category === "quality") return "issues";

  return "news";
}

function parseMarkdownImageLine(line: string): { alt: string; src: string } | null {
  const match = line.match(/^!\[([^\]]*)]\((https?:\/\/[^)\s]+)\)$/);

  if (!match) {
    return null;
  }

  return {
    alt: match[1] || "image",
    src: match[2],
  };
}

function isPdfAttachment(post: DashboardNewsPost): boolean {
  const attachment = post.attachment;

  if (!attachment) {
    return false;
  }

  return (
    attachment.mimeType === "application/pdf" ||
    attachment.name.toLowerCase().endsWith(".pdf")
  );
}

function resolveDashboardEntryId(entryId: string): string {
  return entryId === "new-order" ? "orders" : entryId;
}

function isConnectedDashboardEntry(entryId: string): boolean {
  return (
    entryId === "home" ||
    entryId === "orders" ||
    entryId === "profile" ||
    entryId === "recruitment-requests" ||
    entryId === "stores" ||
    entryId === "training"
  );
}

export function DashboardHomeScreen({
  language,
  user,
  onChangeLanguage,
  onLogout,
  onChangePassword,
  onUpdateProfile,
}: DashboardHomeScreenProps) {
  const copy = DASHBOARD_COPY[language];
  const orderCopy = ORDER_COPY[language];
  const [activeEntry, setActiveEntry] = useState("home");

  // Route to the relevant module when the app is opened from a push tap.
  useNotificationNavigation((entry) => setActiveEntry(entry));
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  // The order module reports when its long product-selection view is active so
  // the scroll-to-top/bottom helpers only show there, not on the supplier list.
  const [isOrderProductView, setIsOrderProductView] = useState(false);
  const [newsPosts, setNewsPosts] = useState<DashboardNewsPost[]>([]);
  const [newsError, setNewsError] = useState("");
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [newsSearchTerm, setNewsSearchTerm] = useState("");
  const [selectedNewsCategory, setSelectedNewsCategory] =
    useState<NewsDeskCategory>("news");
  const [selectedNewsPost, setSelectedNewsPost] =
    useState<DashboardNewsPost | null>(null);
  const [pdfPreviewPost, setPdfPreviewPost] =
    useState<DashboardNewsPost | null>(null);
  const [isLoadingPdfPreview, setIsLoadingPdfPreview] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState("");
  const [isLoadingSelectedNews, setIsLoadingSelectedNews] = useState(false);
  const [readerError, setReaderError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const newsCarouselRef = useRef<ScrollView>(null);
  const pdfLoadingStartedAtRef = useRef(0);
  const pdfLoadingTokenRef = useRef(0);
  const [newsCarouselIndex, setNewsCarouselIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  // Safe-area insets read here (outside the Modal) — RN Modal renders in a
  // separate native window where SafeAreaView resolves insets to 0.
  const insets = useSafeAreaInsets();

  // "更多" panel slides in from the right edge (right → left) instead of bottom up.
  const [isMoreRendered, setIsMoreRendered] = useState(false);
  const moreDrawerProgress = useRef(new Animated.Value(0)).current;
  const moreDrawerWidth = Math.min(420, Math.round(screenWidth * 0.55));
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
  const moreNavLabel = DASHBOARD_PRIMARY_NAV.find((item) => item.id === "more")?.label[language];
  const newsCarouselCardWidth = Math.max(280, Math.min(screenWidth - 80, 360));
  const newsCarouselSnapInterval = newsCarouselCardWidth + 12;
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
      newsPosts.filter((post) => {
        const matchesCategory =
          resolveNewsDeskCategory(post.category) === selectedNewsCategory;

        return matchesCategory && postMatchesSearch(post, newsSearchTerm);
      }),
    [newsPosts, newsSearchTerm, selectedNewsCategory],
  );
  const canGoToPreviousNews = newsCarouselIndex > 0;
  const canGoToNextNews = newsCarouselIndex < visibleNewsPosts.length - 1;
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

  useEffect(() => {
    setNewsCarouselIndex(0);
    newsCarouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [newsSearchTerm, selectedNewsCategory]);

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

  function scrollNewsCarousel(direction: "previous" | "next"): void {
    const nextIndex =
      direction === "next"
        ? Math.min(newsCarouselIndex + 1, visibleNewsPosts.length - 1)
        : Math.max(newsCarouselIndex - 1, 0);

    setNewsCarouselIndex(nextIndex);
    newsCarouselRef.current?.scrollTo({
      x: nextIndex * newsCarouselSnapInterval,
      animated: true,
    });
  }

  function handleNewsCarouselScrollEnd(offsetX: number): void {
    const nextIndex = Math.round(offsetX / newsCarouselSnapInterval);
    setNewsCarouselIndex(
      Math.max(0, Math.min(nextIndex, visibleNewsPosts.length - 1)),
    );
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
          {line || " "}
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
              onProductViewChange={setIsOrderProductView}
            />
          ) : activeEntry === "stores" ? (
            <StoresModuleScreen language={language} user={user} />
          ) : activeEntry === "profile" ? (
            <ProfileScreen
              language={language}
              user={user}
              onChangeLanguage={onChangeLanguage}
              onLogout={onLogout}
              onChangePassword={onChangePassword}
              onUpdateProfile={onUpdateProfile}
            />
          ) : activeEntry === "recruitment-requests" ? (
            <RecruitmentModuleScreen language={language} />
          ) : activeEntry === "training" ? (
            <TrainingModuleScreen language={language} />
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

              <View style={styles.newsDesk}>
                <View style={styles.newsHeader}>
                  <TrackingText color={authControlStyles.colors.red} size={10.5}>
                    {copy.newsTitle}
                  </TrackingText>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.newsCategoryScroller}
                >
                  {NEWS_CATEGORY_FILTERS.map((category) => {
                    const isActive = selectedNewsCategory === category;

                    return (
                      <Pressable
                        key={category}
                        style={[
                          styles.newsCategoryPill,
                          isActive ? styles.newsCategoryPillActive : null,
                        ]}
                        onPress={() => setSelectedNewsCategory(category)}
                      >
                        <Text
                          style={[
                            styles.newsCategoryText,
                            isActive ? styles.newsCategoryTextActive : null,
                          ]}
                        >
                          {copy.newsCategories[category]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {isLoadingNews ? (
                  <View style={styles.stateRow}>
                    <ZhaoLoadingIndicator label={copy.loadingNews} />
                  </View>
                ) : null}

                {!isLoadingNews && newsError ? (
                  <Text style={styles.stateText}>{newsError}</Text>
                ) : null}

                {!isLoadingNews && !newsError && newsPosts.length === 0 ? (
                  <Text style={styles.stateText}>{copy.emptyNews}</Text>
                ) : null}

                {!isLoadingNews && !newsError && newsPosts.length > 0 ? (
                  <>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder={copy.newsSearchPlaceholder}
                      placeholderTextColor={authControlStyles.colors.ink40}
                      style={styles.newsSearchInput}
                      value={newsSearchTerm}
                      onChangeText={setNewsSearchTerm}
                    />

                    <View style={styles.newsSectionHeader}>
                      <Text style={styles.newsSectionTitle}>{copy.newsListLabel}</Text>
                      <View style={styles.carouselControls}>
                        <Text style={styles.newsMetaText}>
                          {visibleNewsPosts.length}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          disabled={!canGoToPreviousNews}
                          style={[
                            styles.carouselControlButton,
                            !canGoToPreviousNews
                              ? styles.carouselControlButtonDisabled
                              : null,
                          ]}
                          onPress={() => scrollNewsCarousel("previous")}
                        >
                          <Ionicons
                            color={authControlStyles.colors.red}
                            name="arrow-back-outline"
                            size={16}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={!canGoToNextNews}
                          style={[
                            styles.carouselControlButton,
                            !canGoToNextNews
                              ? styles.carouselControlButtonDisabled
                              : null,
                          ]}
                          onPress={() => scrollNewsCarousel("next")}
                        >
                          <Ionicons
                            color={authControlStyles.colors.red}
                            name="arrow-forward-outline"
                            size={16}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {visibleNewsPosts.length === 0 ? (
                      <Text style={styles.stateText}>{copy.newsNoSearchResult}</Text>
                    ) : (
                      <View style={styles.newsCarouselFrame}>
                        <ScrollView
                          ref={newsCarouselRef}
                          horizontal
                          contentContainerStyle={styles.newsCarouselContent}
                          decelerationRate="fast"
                          showsHorizontalScrollIndicator={false}
                          snapToAlignment="start"
                          snapToInterval={newsCarouselSnapInterval}
                          style={styles.newsCarousel}
                          onMomentumScrollEnd={(event) =>
                            handleNewsCarouselScrollEnd(
                              event.nativeEvent.contentOffset.x,
                            )
                          }
                        >
                          {visibleNewsPosts.map((post) => (
                            <Pressable
                              key={post.id}
                              style={[
                                styles.newsCard,
                                { width: newsCarouselCardWidth },
                              ]}
                              onPress={() => void handleOpenNewsPost(post)}
                            >
                              <View style={styles.newsMetaRow}>
                                <Text style={styles.newsMetaText}>
                                  {formatDate(post.createdAt)}
                                </Text>
                                <Text style={styles.newsMetaText}>
                                  {copy.newsCategories[
                                    resolveNewsDeskCategory(post.category)
                                  ]}
                                </Text>
                              </View>
                              <Text style={styles.newsTitle}>{post.title}</Text>
                              <Text style={styles.newsSummary} numberOfLines={3}>
                                {post.summary}
                              </Text>
                              <View style={styles.newsCardFooter}>
                                <Text style={styles.newsAuthor}>
                                  {post.authorName || "-"} · {post.restaurantName || "-"}
                                </Text>
                                <Text style={styles.newsReadMore}>{copy.newsReadMore}</Text>
                              </View>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                ) : null}
              </View>

              <StoreScoreLeaderboard language={language} />

              <Modal
                animationType="slide"
                presentationStyle="overFullScreen"
                transparent
                visible={!!selectedNewsPost}
                onRequestClose={handleCloseNewsReader}
              >
                <View style={styles.readerModalRoot}>
                  <Pressable
                    style={styles.readerBackdrop}
                    onPress={handleCloseNewsReader}
                  />
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
                            {copy.newsCategories[
                              resolveNewsDeskCategory(selectedNewsPost.category)
                            ]}
                          </Text>
                          <Pressable style={styles.readerCloseButton}
                                     onPress={handleCloseNewsReader}>
                            <Text style={styles.sheetCloseText}>
                              {copy.newsReaderClose}
                            </Text>
                          </Pressable>
                        </View>
                        <ScrollView
                          showsVerticalScrollIndicator={false}
                          style={styles.readerScroll}
                        >
                          <Text style={styles.readerTitle}>{selectedNewsPost.title}</Text>
                          <Text style={styles.readerSummary}>
                            {selectedNewsPost.summary}
                          </Text>
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
                          {readerError ? (
                            <Text style={styles.stateText}>{readerError}</Text>
                          ) : null}
                          {selectedNewsPost.attachment?.href ? (
                            <Pressable
                              style={styles.attachmentCard}
                              onPress={() => void handleOpenAttachment(selectedNewsPost)}
                            >
                              <View style={styles.attachmentBody}>
                                <Text style={styles.newsMetaText}>
                                  {copy.newsAttachment}
                                </Text>
                                <Text style={styles.attachmentName}>
                                  {selectedNewsPost.attachment.name || "-"}
                                </Text>
                                <Text style={styles.stateText}>
                                  {formatAttachmentSize(
                                    selectedNewsPost.attachment.sizeBytes,
                                  )}
                                </Text>
                              </View>
                              <Text style={styles.newsReadMore}>
                                {copy.newsOpenAttachment}
                              </Text>
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
                      <Pressable style={styles.readerCloseButton}
                          onPress={handleClosePdfPreview}>
                        <Text style={styles.sheetCloseText}>
                          {copy.newsReaderClose}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.pdfViewer}>
                      {pdfPreviewPost?.attachment?.href ? (
                        <ProtectedScreen>
                          <WebView
                            originWhitelist={["*"]}
                            source={{ uri: pdfPreviewPost.attachment.href }}
                            startInLoadingState
                            style={styles.pdfWebView}
                            onError={() => {
                              finishPdfLoading(() =>
                                setPdfPreviewError(copy.newsPdfPreviewError),
                              );
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
            {visiblePrimaryNav.filter((item) => item.id !== "more").map((item) => {
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
                  <Ionicons color={navColor} name={item.icon} size={22} />
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

        {activeEntry === "orders" && isOrderProductView ? (
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
              <BlurView intensity={42} tint="light" style={styles.sheet}>
                <View style={styles.sheetSurface} />
                <View
                  style={[
                    styles.sheetContent,
                    {
                      paddingTop: insets.top + 10,
                      paddingBottom: insets.bottom + 10,
                      paddingRight: insets.right + 20,
                    },
                  ]}
                >
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
                </View>
              </BlurView>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create(scaleStyles({
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
    paddingHorizontal: 12,
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
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 68,
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
  carouselControlButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(193, 22, 22, 0.2)",
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 36,
  },
  carouselControlButtonDisabled: {
    opacity: 0.32,
  },
  carouselControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  newsCard: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(193, 22, 22, 0.16)",
    borderWidth: 1,
    justifyContent: "space-between",
    marginRight: 12,
    minHeight: 206,
    padding: 16,
  },
  newsCardFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 12,
  },
  newsCategoryPill: {
    borderColor: "rgba(10, 10, 10, 0.1)",
    borderWidth: 1,
    justifyContent: "center",
    marginRight: 8,
    minHeight: 36,
    paddingHorizontal: 13,
  },
  newsCategoryPillActive: {
    backgroundColor: authControlStyles.colors.red,
    borderColor: authControlStyles.colors.red,
  },
  newsCategoryScroller: {
    marginTop: 14,
  },
  newsCategoryText: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 14,
    fontWeight: "600",
  },
  newsCategoryTextActive: {
    color: "#ffffff",
  },
  newsDesk: {
    gap: 14,
    marginTop: 22,
  },
  newsHeader: {
    gap: 8,
  },
  newsCarousel: {
    marginHorizontal: -20,
  },
  newsCarouselContent: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  newsCarouselFrame: {
    position: "relative",
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
  newsSearchInput: {
    backgroundColor: "#ffffff",
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  newsSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  newsSectionTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
  },
  newsSummary: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },
  newsTag: {
    borderColor: "rgba(193, 22, 22, 0.18)",
    borderWidth: 1,
    color: authControlStyles.colors.red,
    fontFamily: "serif",
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
  newsTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 21,
    fontWeight: "500",
    lineHeight: 26,
    marginTop: 10,
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
    fontFamily: "serif",
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
    fontFamily: "serif",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  readerTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36,
    marginTop: 16,
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
    backgroundColor: Platform.select({
      ios: "rgba(193, 22, 22, 0.07)",
      default: "rgba(255, 255, 255, 0.94)",
    }),
    borderColor: "rgba(193, 22, 22, 0.22)",
    borderLeftWidth: 1,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    ...crossPlatformShadow({
      color: authControlStyles.colors.red,
      offset: { width: -16, height: 0 },
      opacity: 0.14,
      radius: 30,
      elevation: 24,
    }),
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
    alignItems: "flex-start",
    borderBottomColor: "rgba(193, 22, 22, 0.16)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 18,
  },
  sheetList: {
    flex: 1,
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
  sheetContent: {
    flex: 1,
    paddingBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
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
}));
