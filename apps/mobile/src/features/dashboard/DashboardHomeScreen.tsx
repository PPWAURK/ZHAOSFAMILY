import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  InteractionManager,
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
import { useNetInfo } from "@react-native-community/netinfo";
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
import { dashboardNewsQueryKeys } from "@zhao/api";
import { useIsRestoring, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { PlatformBlurView } from "@/components/PlatformBlurView";
import { SidebarMenuToggle } from "@/components/SidebarMenuToggle";
import { FeedbackPressable } from "@/components/FeedbackPressable";
import { RemoteImage } from "@/components/RemoteImage";
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
  confirmDashboardNewsRead,
  fetchDashboardNewsPost,
  fetchDashboardNewsReadStatus,
  fetchDashboardNewsPosts,
  type DashboardNewsPost,
} from "@/features/dashboard/dashboardNewsApi";
import { DashboardNewsBoard } from "@/features/dashboard/DashboardNewsBoard";
import {
  NewsPdfPreviewModal,
  type NewsPdfPreviewHandle,
} from "@/features/dashboard/NewsPdfPreviewModal";
import { DashboardRefreshProvider } from "@/features/dashboard/DashboardRefreshContext";
import {
  isPdfAttachment,
} from "@/features/dashboard/dashboardNewsAttachment";
import { MandatoryNewsModal } from "@/features/dashboard/MandatoryNewsModal";
import {
  NewsReaderModal,
  type NewsReadStatusState,
} from "@/features/dashboard/NewsReaderModal";
import { newsReaderStyleDefs } from "@/features/dashboard/newsReaderStyleDefs";
import {
  resolveNewsDeskCategory,
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
import { InvitePartnerScreen } from "@/features/stores/InvitePartnerScreen";
import { TRAINING_COPY } from "@/features/training/trainingCopy";
import { TrainingHistoryView } from "@/features/training/TrainingHistoryView";
import { TrainingModuleScreen } from "@/features/training/TrainingModuleScreen";
import { TrainingTitleFrame } from "@/features/training/TrainingTitleFrame";
import { fetchTrainingMyTitles } from "@/features/training/trainingApi";
import type { TrainingTitle } from "@/features/training/trainingTypes";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { MobileOnboardingModal } from "@/features/onboarding/MobileOnboardingModal";
import {
  shouldShowMobileOnboarding,
  type MobileOnboardingTargetBounds,
  type MobileOnboardingTargetId,
  type MobileOnboardingTargets,
} from "@/features/onboarding/mobileOnboardingState";
import { useSplashCompletion } from "@/features/splash/SplashCompletionProvider";
import { prepareHighFrequencyPages } from "@/lib/pagePreloadManager";

type DashboardHomeScreenProps = {
  isOffline?: boolean;
  language: AuthLanguage;
  user: AuthUser;
  onChangeLanguage: (language: AuthLanguage) => void;
  onLogout: () => Promise<void>;
  onChangePassword: (input: ChangePasswordRequest) => Promise<void>;
  onUpdateProfile: (input: UpdateMeRequest) => Promise<void>;
  onCompleteMobileOnboarding: () => Promise<void>;
  onDeleteAccount: (input: DeleteAccountRequest) => Promise<void>;
};

const EMPTY_ONBOARDING_TARGETS: MobileOnboardingTargets = {
  congrats: null,
  issues: null,
  more: null,
  news: null,
  orders: null,
  training: null,
};

const MAX_NEWS_PER_CATEGORY = 20;
const MAX_MOUNTED_ENTRIES = 4;
const DASHBOARD_ENTRY_TRANSITION_MS = 160;

type DashboardEntryTransitionProps = {
  animateOnMount: boolean;
  children: ReactNode;
  isActive: boolean;
  reduceMotion: boolean;
};

function DashboardEntryTransition({
  animateOnMount,
  children,
  isActive,
  reduceMotion,
}: DashboardEntryTransitionProps): ReactNode {
  const progress = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current;
  const wasActive = useRef(isActive && !animateOnMount);

  useEffect(() => {
    if (!isActive) {
      wasActive.current = false;
      progress.stopAnimation();
      return;
    }

    if (reduceMotion) {
      progress.setValue(1);
      wasActive.current = true;
      return;
    }

    if (wasActive.current) return;

    wasActive.current = true;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      duration: DASHBOARD_ENTRY_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [isActive, progress, reduceMotion]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [reduceMotion ? 0 : 8, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

type DashboardContentContainerProps = {
  children: ReactNode;
};

function DashboardContentContainer({ children }: DashboardContentContainerProps): ReactNode {
  return <View>{children}</View>;
}

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

function hasDashboardJobRole(user: AuthUser, role: string): boolean {
  return `${user.jobRole || user.position || user.role || ""}`
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .includes(role);
}

function postMatchesSearch(post: DashboardNewsPost, searchTerm: string): boolean {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [post.title, post.summary, post.body, post.authorName, post.restaurantName, ...post.tags]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function resolveDashboardEntryId(entryId: string): string {
  return entryId === "new-order" ? "orders" : entryId;
}

function retainRecentDashboardEntries(
  currentEntries: string[],
  nextEntry: string,
  dirtyEntries: Set<string>,
): string[] {
  const recency = [
    ...currentEntries.filter((entryId) => entryId !== "home" && entryId !== nextEntry),
    ...(nextEntry === "home" ? [] : [nextEntry]),
  ];
  const pinnedEntries = new Set(recency.filter((entryId) => dirtyEntries.has(entryId)));
  if (nextEntry !== "home") pinnedEntries.add(nextEntry);
  const targetCount = Math.max(MAX_MOUNTED_ENTRIES - 1, pinnedEntries.size);
  const retainedEntries = new Set(pinnedEntries);

  for (let index = recency.length - 1; index >= 0 && retainedEntries.size < targetCount; index -= 1) {
    retainedEntries.add(recency[index]);
  }

  return ["home", ...recency.filter((entryId) => retainedEntries.has(entryId))];
}

function isConnectedDashboardEntry(entryId: string): boolean {
  return (
    entryId === "home" ||
    entryId === "case-shares" ||
    entryId === "my-case-shares" ||
    entryId === "orders" ||
    entryId === "recipes" ||
    entryId === "profile" ||
    entryId === "invite-partner" ||
    entryId === "recruitment-requests" ||
    entryId === "store-grade-ranking" ||
    entryId === "stores" ||
    entryId === "training" ||
    entryId === "training-records"
  );
}

export function DashboardHomeScreen({
  isOffline: isOfflineSession = false,
  language,
  user,
  onChangeLanguage,
  onLogout,
  onChangePassword,
  onUpdateProfile,
  onCompleteMobileOnboarding,
  onDeleteAccount,
}: DashboardHomeScreenProps) {
  useScreenName("dashboard");
  const isQueryCacheRestoring = useIsRestoring();
  const network = useNetInfo();
  const isOffline =
    isOfflineSession ||
    network.isConnected === false ||
    network.isInternetReachable === false;
  const copy = DASHBOARD_COPY[language];
  const orderCopy = ORDER_COPY[language];
  const isSplashComplete = useSplashCompletion();
  const [activeEntry, setActiveEntry] = useState("home");
  const [mountedEntries, setMountedEntries] = useState<string[]>(["home"]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [shouldWarmAvatarCache, setShouldWarmAvatarCache] = useState(false);
  const [isOnboardingReplay, setIsOnboardingReplay] = useState(false);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [isOnboardingReplayPending, setIsOnboardingReplayPending] = useState(false);
  const [onboardingTargets, setOnboardingTargets] =
    useState<MobileOnboardingTargets>(EMPTY_ONBOARDING_TARGETS);

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  // The order module reports when its long product-selection view is active so
  // the scroll-to-top/bottom helpers only show there, not on the supplier list.
  const [isOrderProductView, setIsOrderProductView] = useState(false);
  const [caseSharePublishAction, setCaseSharePublishAction] = useState<(() => void) | null>(null);
  const queryClient = useQueryClient();
  const dashboardNewsQuery = useQuery({
    meta: { persist: true },
    placeholderData: (previousData) => previousData,
    queryFn: fetchDashboardNewsPosts,
    queryKey: dashboardNewsQueryKeys.lists(),
  });
  const newsPosts = dashboardNewsQuery.data ?? [];
  const refreshDashboardNews = useCallback((): void => {
    void dashboardNewsQuery.refetch();
  }, [dashboardNewsQuery.refetch]);
  const newsError = dashboardNewsQuery.isError ? copy.newsError : "";
  const isLoadingNews = dashboardNewsQuery.isPending && !dashboardNewsQuery.data;
  const [newsSearchTerm, setNewsSearchTerm] = useState("");
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<NewsDeskCategory>("news");
  const [selectedNewsPost, setSelectedNewsPost] = useState<DashboardNewsPost | null>(null);
  const [isLoadingSelectedNews, setIsLoadingSelectedNews] = useState(false);
  const [readerError, setReaderError] = useState("");
  const [readConfirmationState, setReadConfirmationState] = useState({
    postId: "",
    message: "",
  });
  const [readStatusState, setReadStatusState] = useState<NewsReadStatusState>({
    postId: "",
    status: null,
    error: "",
    isLoading: false,
  });
  const [actionMessage, setActionMessage] = useState("");
  const [equippedTitle, setEquippedTitle] = useState<TrainingTitle | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const dirtyEntriesRef = useRef(new Set<string>());
  const preloadedHomeUserRef = useRef<string | null>(null);
  const pdfPreviewRef = useRef<NewsPdfPreviewHandle>(null);
  const [newsCarouselIndex, setNewsCarouselIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const canViewNewsReadStats = !isOffline && hasDashboardJobRole(user, "holding");
  // Safe-area insets read here (outside the Modal) — RN Modal renders in a
  // separate native window where SafeAreaView resolves insets to 0.
  const insets = useSafeAreaInsets();

  const handleCaseSharePublishActionChange = useCallback((action: (() => void) | null): void => {
    setCaseSharePublishAction(() => action);
  }, []);

  // Keep the mobile trigger on the right while matching the Web drawer styling.
  const [isMoreRendered, setIsMoreRendered] = useState(false);
  const moreDrawerProgress = useRef(new Animated.Value(0)).current;
  const lastOnboardingUserIdRef = useRef<string | null>(null);
  const moreNavigationRef = useRef<View>(null);
  const orderNavigationRef = useRef<View>(null);
  const trainingNavigationRef = useRef<View>(null);
  const moreDrawerWidth = Math.min(360, Math.round(screenWidth * 0.88));

  const scrollDashboardToTop = useCallback((): void => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ animated: false, y: 0 });
    });
  }, []);

  const updateEntryDirtyState = useCallback((entryId: string, isDirty: boolean): void => {
    if (isDirty) {
      dirtyEntriesRef.current.add(entryId);
      return;
    }

    dirtyEntriesRef.current.delete(entryId);
  }, []);
  const handleOrdersDirtyStateChange = useCallback(
    (isDirty: boolean): void => updateEntryDirtyState("orders", isDirty),
    [updateEntryDirtyState],
  );
  const handleStoresDirtyStateChange = useCallback(
    (isDirty: boolean): void => updateEntryDirtyState("stores", isDirty),
    [updateEntryDirtyState],
  );
  const handleInvitePartnerDirtyStateChange = useCallback(
    (isDirty: boolean): void => updateEntryDirtyState("invite-partner", isDirty),
    [updateEntryDirtyState],
  );
  const handleProfileDirtyStateChange = useCallback(
    (isDirty: boolean): void => updateEntryDirtyState("profile", isDirty),
    [updateEntryDirtyState],
  );
  const handleRecruitmentDirtyStateChange = useCallback(
    (isDirty: boolean): void => updateEntryDirtyState("recruitment-requests", isDirty),
    [updateEntryDirtyState],
  );
  const handlePublicCasesDirtyStateChange = useCallback(
    (isDirty: boolean): void => updateEntryDirtyState("case-shares", isDirty),
    [updateEntryDirtyState],
  );
  const handleMyCasesDirtyStateChange = useCallback(
    (isDirty: boolean): void => updateEntryDirtyState("my-case-shares", isDirty),
    [updateEntryDirtyState],
  );

  const navigateToEntry = useCallback(
    (nextEntry: string): void => {
      const resolvedEntry = resolveDashboardEntryId(nextEntry);

      if (isOffline && resolvedEntry !== "home") return;

      if (resolvedEntry === activeEntry) {
        scrollDashboardToTop();
        return;
      }

      setMountedEntries((currentEntries) =>
        retainRecentDashboardEntries(currentEntries, resolvedEntry, dirtyEntriesRef.current),
      );
      setActiveEntry(resolvedEntry);
      scrollDashboardToTop();
    },
    [activeEntry, isOffline, scrollDashboardToTop],
  );

  // Route push-notification destinations through the same immediate navigation path.
  useNotificationNavigation(navigateToEntry);

  useEffect(() => {
    if (isOffline && activeEntry !== "home") {
      navigateToEntry("home");
    }
  }, [activeEntry, isOffline, navigateToEntry]);

  useEffect(() => {
    let isCurrent = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isCurrent) setReduceMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);

    return () => {
      isCurrent = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (activeEntry === "home") return;

    setSelectedNewsPost(null);
    pdfPreviewRef.current?.close();
  }, [activeEntry]);

  const renderedEntries = mountedEntries;

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

  useEffect(() => {
    if (!isOnboardingReplayPending || isMoreRendered) return;

    setIsOnboardingReplayPending(false);
    setIsOnboardingReplay(true);
    setIsOnboardingVisible(true);
  }, [isMoreRendered, isOnboardingReplayPending]);

  const displayName = resolveDisplayName(user, copy.greetingFallback);
  const userCard = useMemo(
    () => resolveDashboardUserCard(user, copy.greetingFallback),
    [copy.greetingFallback, user],
  );

  useEffect(() => {
    let isActive = true;

    async function loadEquippedTitle(): Promise<void> {
      if (!isMoreOpen || isOffline) return;

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
  }, [isMoreOpen, isOffline, user.id]);
  const moreNavLabel = DASHBOARD_PRIMARY_NAV.find((item) => item.id === "more")?.label[language];
  const visiblePrimaryNav = useMemo(
    () =>
      DASHBOARD_PRIMARY_NAV.filter(
        (item) =>
          isOffline
            ? item.id === "home" || item.id === "more"
            : canSeeNavEntry(user, item),
      ),
    [isOffline, user],
  );
  const visibleMoreGroups = useMemo(
    () => {
      if (isOffline) return [];

      return DASHBOARD_MORE_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canSeeNavEntry(user, item)),
      })).filter((group) => group.items.length > 0);
    },
    [isOffline, user],
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
  const mandatoryNewsPost = useMemo(() => {
    if (isOffline) return null;

    return (
      newsPosts.find(
        (post) => post.readConfirmation?.isRequired && !post.readConfirmation.confirmedAt,
      ) ?? null
    );
  }, [isOffline, newsPosts]);

  useEffect(() => {
    setNewsCarouselIndex(0);
  }, [newsSearchTerm, selectedNewsCategory]);

  useEffect(() => {
    if (isOffline) {
      setIsOnboardingReplayPending(false);
      setIsOnboardingVisible(false);
      return;
    }

    if (!isSplashComplete) return;

    const userId = String(user.id);

    if (!shouldShowMobileOnboarding(user.mobileOnboardingCompletedAt)) {
      lastOnboardingUserIdRef.current = userId;
      return;
    }

    if (lastOnboardingUserIdRef.current !== userId) {
      lastOnboardingUserIdRef.current = userId;
      setIsOnboardingReplay(false);
      setIsOnboardingVisible(true);
    }
  }, [isOffline, isSplashComplete, user.id, user.mobileOnboardingCompletedAt]);

  useEffect(() => {
    if (
      isOffline ||
      activeEntry !== "home" ||
      isMoreOpen ||
      isQueryCacheRestoring ||
      !isSplashComplete
    ) {
      return undefined;
    }

    const preloadKey = `${user.id}:${language}`;

    if (preloadedHomeUserRef.current === preloadKey) return undefined;

    const interaction = InteractionManager.runAfterInteractions(() => {
      preloadedHomeUserRef.current = preloadKey;
      setShouldWarmAvatarCache(true);
      void prepareHighFrequencyPages({ language, queryClient, userId: user.id });
    });

    return () => interaction.cancel();
  }, [
    activeEntry,
    isMoreOpen,
    isOffline,
    isQueryCacheRestoring,
    isSplashComplete,
    language,
    queryClient,
    user.id,
  ]);

  const updateOnboardingTarget = useCallback(
    (target: MobileOnboardingTargetId, nextBounds: MobileOnboardingTargetBounds): void => {
      setOnboardingTargets((current) => {
        const currentBounds = current[target];

        if (
          currentBounds &&
          currentBounds.x === nextBounds.x &&
          currentBounds.y === nextBounds.y &&
          currentBounds.width === nextBounds.width &&
          currentBounds.height === nextBounds.height
        ) {
          return current;
        }

        return { ...current, [target]: nextBounds };
      });
    },
    [],
  );

  const measureOnboardingTargets = useCallback((): void => {
    const targets: Partial<MobileOnboardingTargets> = {};
    const targetRefs: Array<{
      ref: RefObject<View | null>;
      target: "more" | "orders" | "training";
    }> = [
      { ref: moreNavigationRef, target: "more" },
      { ref: orderNavigationRef, target: "orders" },
      { ref: trainingNavigationRef, target: "training" },
    ];
    const targetsToMeasure = targetRefs.filter(({ ref }) => ref.current !== null);
    let pendingMeasurements = targetsToMeasure.length;

    if (pendingMeasurements === 0) return;

    function storeMeasurement(
      target: "more" | "orders" | "training",
      x: number,
      y: number,
      width: number,
      height: number,
    ): void {
      targets[target] = { height, width, x, y };
      pendingMeasurements -= 1;

      if (pendingMeasurements === 0) {
        setOnboardingTargets((current) => ({
          ...current,
          more: targets.more ?? current.more,
          orders: targets.orders ?? current.orders,
          training: targets.training ?? current.training,
        }));
      }
    }

    targetsToMeasure.forEach(({ ref, target }) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        storeMeasurement(target, x, y, width, height);
      });
    });
  }, []);

  useEffect(() => {
    if (!isOnboardingVisible) return undefined;

    const animationFrame = requestAnimationFrame(measureOnboardingTargets);

    return () => cancelAnimationFrame(animationFrame);
  }, [isOnboardingVisible, measureOnboardingTargets, screenWidth]);

  function handleEntryPress(item: DashboardNavItem): void {
    setActionMessage("");

    if (item.id === "more") {
      setIsMoreOpen(true);
      return;
    }

    const nextEntry = resolveDashboardEntryId(item.id);
    navigateToEntry(nextEntry);

    if (!isConnectedDashboardEntry(nextEntry)) {
      setActionMessage(copy.unavailable);
    }
  }

  function handleMoreItemPress(item: DashboardMenuItem): void {
    const nextEntry = resolveDashboardEntryId(item.id);

    setIsMoreOpen(false);
    navigateToEntry(nextEntry);
    setActionMessage(isConnectedDashboardEntry(nextEntry) ? "" : copy.unavailable);
  }

  function openOnboardingReplay(): void {
    navigateToEntry("home");
    setIsMoreOpen(false);
    setIsOnboardingReplayPending(true);
  }

  async function completeOnboarding(destination: "home" | "training" | null): Promise<void> {
    if (isOffline) return;

    if (destination === null) {
      setIsOnboardingVisible(false);
      setIsOnboardingReplay(false);
      return;
    }

    await onCompleteMobileOnboarding();
    setIsOnboardingVisible(false);
    setIsOnboardingReplay(false);

    if (destination === "training") {
      navigateToEntry("training");
    }
  }

  async function handleLogoutPress(): Promise<void> {
    setIsMoreOpen(false);
    await onLogout();
  }

  const loadNewsReadStatus = useCallback(
    async (postId: string): Promise<void> => {
      try {
        setReadStatusState({ postId, status: null, error: "", isLoading: true });
        const status = await fetchDashboardNewsReadStatus(postId);
        setReadStatusState({ postId, status, error: "", isLoading: false });
      } catch {
        setReadStatusState({
          postId,
          status: null,
          error: copy.newsReadStatusError,
          isLoading: false,
        });
      }
    },
    [copy.newsReadStatusError],
  );

  const handleOpenNewsPost = useCallback(
    async (post: DashboardNewsPost): Promise<void> => {
      setReaderError("");
      setSelectedNewsPost(post);

      if (isOffline) {
        setIsLoadingSelectedNews(false);
        return;
      }

      setIsLoadingSelectedNews(true);

      try {
        const nextPost = (await fetchDashboardNewsPost(post.id)) ?? post;
        setSelectedNewsPost(nextPost);

        if (canViewNewsReadStats) {
          await loadNewsReadStatus(nextPost.id);
        }
      } catch {
        setReaderError(copy.readerError);
      } finally {
        setIsLoadingSelectedNews(false);
      }
    },
    [canViewNewsReadStats, copy.readerError, isOffline, loadNewsReadStatus],
  );

  function handleCloseNewsReader(): void {
    setSelectedNewsPost(null);
    setReaderError("");
    setIsLoadingSelectedNews(false);
    setReadConfirmationState({ postId: "", message: "" });
    setReadStatusState({ postId: "", status: null, error: "", isLoading: false });
  }

  const handleConfirmNewsRead = useCallback(
    async (postId: string): Promise<void> => {
      if (isOffline) return;

      try {
        setReadConfirmationState({ postId, message: "" });
        const confirmation = await confirmDashboardNewsRead(postId);

        const updateReadConfirmation = (post: DashboardNewsPost): DashboardNewsPost =>
          post.id === postId ? { ...post, readConfirmation: confirmation } : post;

        setSelectedNewsPost((currentPost) =>
          currentPost ? updateReadConfirmation(currentPost) : currentPost,
        );
        queryClient.setQueryData<DashboardNewsPost[]>(
          dashboardNewsQueryKeys.lists(),
          (current) => current?.map(updateReadConfirmation) ?? current,
        );
        setReadConfirmationState({ postId: "", message: copy.newsReadConfirmed });

        if (canViewNewsReadStats) {
          await loadNewsReadStatus(postId);
        }
      } catch {
        setReadConfirmationState({ postId: "", message: copy.newsReadConfirmError });
      }
    },
    [
      canViewNewsReadStats,
      copy.newsReadConfirmError,
      copy.newsReadConfirmed,
      isOffline,
      loadNewsReadStatus,
      queryClient,
    ],
  );

  async function handleOpenAttachment(post: DashboardNewsPost): Promise<void> {
    const attachment = post.attachment;
    if (!attachment?.href) {
      setReaderError(copy.newsAttachmentOpenError);
      return;
    }

    if (isPdfAttachment(post)) {
      setSelectedNewsPost(null);
      setReaderError("");
      setIsLoadingSelectedNews(false);
      await pdfPreviewRef.current?.open(post);
      return;
    }

    try {
      await Linking.openURL(attachment.href);
    } catch {
      setReaderError(copy.newsAttachmentOpenError);
    }
  }

  const moveNewsPost = useCallback(
    (direction: "previous" | "next"): void => {
      setNewsCarouselIndex((currentIndex) => {
        if (direction === "next") {
          return Math.min(currentIndex + 1, visibleNewsPosts.length - 1);
        }

        return Math.max(currentIndex - 1, 0);
      });
    },
    [visibleNewsPosts.length],
  );

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
              {!isOffline ? (
                <NotificationCenter language={language} onOpenEntry={navigateToEntry} />
              ) : null}
              {!isMoreOpen ? (
                <SidebarMenuToggle
                  accessibilityLabel={moreNavLabel ?? copy.moreTitle}
                  ref={moreNavigationRef}
                  style={styles.topMenuButton}
                  onPress={() => setIsMoreOpen(true)}
                  deferPressUntilOpenAnimationCompletes
                  isOpen={false}
                />
              ) : null}
            </View>
          </View>

          {isOffline ? (
            <View accessibilityLiveRegion="polite" style={styles.offlineNotice}>
              <Ionicons color="#ffffff" name="cloud-offline-outline" size={15} />
              <Text style={styles.offlineNoticeText}>
                {language === "zh"
                  ? "离线模式 · 仅可查看已缓存的首页内容"
                  : language === "fr"
                    ? "Hors ligne · accueil enregistré en lecture seule"
                    : "Offline · saved home content is read-only"}
              </Text>
            </View>
          ) : null}

          <DashboardRefreshProvider onForegroundRefresh={refreshDashboardNews}>
            <DashboardContentContainer>
              {renderedEntries.map((entryId) => (
                <View
                  key={entryId}
                  pointerEvents={entryId === activeEntry ? "auto" : "none"}
                  style={entryId === activeEntry ? null : styles.keepAliveEntryHidden}
                >
                  <DashboardEntryTransition
                    animateOnMount={entryId !== "home"}
                    isActive={entryId === activeEntry}
                    reduceMotion={reduceMotion}
                  >
                  {entryId === "orders" ? (
                    <OrderModuleScreen
                      isActive={entryId === activeEntry}
                      language={language}
                      storeName={
                        user.store?.name || user.storeName || user.establishment || undefined
                      }
                      onProductViewChange={setIsOrderProductView}
                      onDirtyStateChange={handleOrdersDirtyStateChange}
                    />
                  ) : entryId === "stores" ? (
                    <StoresModuleScreen
                      isActive={entryId === activeEntry}
                      language={language}
                      user={user}
                      onDirtyStateChange={handleStoresDirtyStateChange}
                    />
                  ) : entryId === "store-grade-ranking" ? (
                    <StoreGradeLeaderboard isActive={entryId === activeEntry} language={language} />
                  ) : entryId === "profile" ? (
                    <ProfileScreen
                      isActive={entryId === activeEntry}
                      language={language}
                      user={user}
                      onDirtyStateChange={handleProfileDirtyStateChange}
                      onChangeLanguage={onChangeLanguage}
                      onLogout={onLogout}
                      onChangePassword={onChangePassword}
                      onUpdateProfile={onUpdateProfile}
                      onDeleteAccount={onDeleteAccount}
                    />
                  ) : entryId === "invite-partner" ? (
                    <InvitePartnerScreen
                      isActive={entryId === activeEntry}
                      language={language}
                      user={user}
                      onDirtyStateChange={handleInvitePartnerDirtyStateChange}
                    />
                  ) : entryId === "recruitment-requests" ? (
                    <RecruitmentModuleScreen
                      isActive={entryId === activeEntry}
                      language={language}
                      onDirtyStateChange={handleRecruitmentDirtyStateChange}
                    />
                  ) : entryId === "recipes" ? (
                    <RecipeModuleScreen
                      isActive={entryId === activeEntry}
                      language={language}
                      user={user}
                    />
                  ) : entryId === "case-shares" ? (
                    <CaseSharesModuleScreen
                      language={language}
                      mode="public"
                      isActive={entryId === activeEntry}
                      onRegisterPublishAction={handleCaseSharePublishActionChange}
                      onOpenMyCases={() => navigateToEntry("my-case-shares")}
                      onDirtyStateChange={handlePublicCasesDirtyStateChange}
                    />
                  ) : entryId === "my-case-shares" ? (
                    <CaseSharesModuleScreen
                      language={language}
                      mode="mine"
                      isActive={entryId === activeEntry}
                      onRegisterPublishAction={handleCaseSharePublishActionChange}
                      onOpenMyCases={() => navigateToEntry("my-case-shares")}
                      onDirtyStateChange={handleMyCasesDirtyStateChange}
                    />
                  ) : entryId === "training" ? (
                    <TrainingModuleScreen
                      isActive={entryId === activeEntry}
                      language={language}
                      user={user}
                    />
                  ) : entryId === "training-records" ? (
                    <TrainingHistoryView
                      copy={TRAINING_COPY[language]}
                      isActive={entryId === activeEntry}
                      language={language}
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
                      </View>

                      {shouldWarmAvatarCache && userCard.avatar ? (
                        <View
                          accessible={false}
                          importantForAccessibility="no-hide-descendants"
                          pointerEvents="none"
                          style={styles.avatarCacheWarmup}
                        >
                          <RemoteImage
                            cacheKey={`dashboard-user-avatar-${user.id}`}
                            loadPriority="lazy"
                            source={{ uri: userCard.avatar }}
                            style={styles.avatarCacheWarmupImage}
                          />
                        </View>
                      ) : null}

                      {!mandatoryNewsPost ? (
                        <DashboardNewsBoard
                          activeCategory={selectedNewsCategory}
                          activeIndex={newsCarouselIndex}
                          copy={copy}
                          error={newsError}
                          isConfirmingRead={isOffline || readConfirmationState.postId !== ""}
                          isLoading={isLoadingNews}
                          posts={newsPosts}
                          searchTerm={newsSearchTerm}
                          userId={user.id}
                          visiblePosts={visibleNewsPosts}
                          onMove={moveNewsPost}
                          onConfirmRead={handleConfirmNewsRead}
                          onOpenPost={handleOpenNewsPost}
                          onCategoryTargetMeasure={updateOnboardingTarget}
                          onSearchChange={setNewsSearchTerm}
                          onSelectCategory={setSelectedNewsCategory}
                        />
                      ) : null}

                      <MandatoryNewsModal
                        confirmMessage={readConfirmationState.message}
                        copy={copy}
                        isConfirming={
                          !!mandatoryNewsPost && readConfirmationState.postId === mandatoryNewsPost.id
                        }
                        isOffline={isOffline}
                        post={mandatoryNewsPost}
                        userId={user.id}
                        onConfirm={handleConfirmNewsRead}
                        onOpenAttachment={handleOpenAttachment}
                      />

                      <NewsReaderModal
                        canViewReadStats={canViewNewsReadStats}
                        confirmMessage={readConfirmationState.message}
                        confirmingPostId={readConfirmationState.postId}
                        copy={copy}
                        error={readerError}
                        isLoading={isLoadingSelectedNews}
                        isOffline={isOffline}
                        post={selectedNewsPost}
                        readStatus={readStatusState}
                        onClose={handleCloseNewsReader}
                        onConfirm={handleConfirmNewsRead}
                        onLoadReadStatus={loadNewsReadStatus}
                        onOpenAttachment={handleOpenAttachment}
                      />

                      <NewsPdfPreviewModal ref={pdfPreviewRef} copy={copy} userId={user.id} />
                      {actionMessage ? (
                        <Text style={styles.actionMessage}>{actionMessage}</Text>
                      ) : null}
                    </>
                  )}
                  </DashboardEntryTransition>
                </View>
              ))}
            </DashboardContentContainer>
          </DashboardRefreshProvider>
        </ScrollView>

        {!isMoreOpen && !isOffline ? (
          <PlatformBlurView intensity={80} tint="light" style={styles.bottomNav}>
            <View style={styles.bottomNavDepth} />
            {visiblePrimaryNav
              .filter((item) => item.id !== "more")
              .map((item) => {
                const isActive = activeEntry === item.id;
                const navColor = isActive ? authControlStyles.colors.red : "rgba(12, 12, 12, 0.44)";
                const navLabel = item.compactLabel?.[language] ?? item.label[language];

                return (
                  <FeedbackPressable
                    key={item.id}
                    accessibilityLabel={item.label[language]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    ref={
                      item.id === "orders"
                        ? orderNavigationRef
                        : item.id === "training"
                          ? trainingNavigationRef
                          : undefined
                    }
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
                  </FeedbackPressable>
                );
              })}
          </PlatformBlurView>
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
                    <SidebarMenuToggle
                      accessibilityLabel={copy.close}
                      isOpen={isMoreOpen}
                      onPress={() => setIsMoreOpen(false)}
                      style={styles.sheetClose}
                    />
                  </View>

                  <View style={styles.sheetUserCard}>
                    <View style={styles.sheetUserBody}>
                      <View style={styles.sheetUserAvatar}>
                        {userCard.avatar ? (
                          <RemoteImage
                            cacheKey={`dashboard-user-avatar-${user.id}`}
                            source={{ uri: userCard.avatar }}
                            style={styles.sheetUserAvatarImage}
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
                            <FeedbackPressable
                              key={item.id}
                              style={styles.moreItem}
                              onPress={() => handleMoreItemPress(item)}
                            >
                              <Text style={styles.moreIndex}>
                                {String(index + 1).padStart(2, "0")}
                              </Text>
                              <Text style={styles.moreText}>{item.label[language]}</Text>
                              <Text style={styles.moreArrow}>→</Text>
                            </FeedbackPressable>
                          ))}
                        </View>
                      </View>
                    ))}
                    {!isOffline ? (
                      <FeedbackPressable
                        accessibilityLabel={copy.onboarding}
                        accessibilityRole="button"
                        style={styles.moreItem}
                        onPress={openOnboardingReplay}
                      >
                        <Text style={styles.moreIndex}>+</Text>
                        <Text style={styles.moreText}>{copy.onboarding}</Text>
                        <Text style={styles.moreArrow}>→</Text>
                      </FeedbackPressable>
                    ) : null}
                  </ScrollView>

                  <FeedbackPressable
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
                  </FeedbackPressable>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
        <MobileOnboardingModal
          isReplay={isOnboardingReplay}
          language={language}
          showOrderStep={visiblePrimaryNav.some((item) => item.id === "orders")}
          targets={onboardingTargets}
          visible={isOnboardingVisible}
          onComplete={completeOnboarding}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create(
  scaleStyles({
    ...newsReaderStyleDefs,
    actionMessage: {
      color: authControlStyles.colors.ink60,
      fontFamily: "serif",
      fontSize: 13,
      lineHeight: 20,
      marginTop: 12,
    },
    avatarCacheWarmup: {
      height: 1,
      left: -2,
      opacity: 0,
      position: "absolute",
      top: -2,
      width: 1,
    },
    avatarCacheWarmupImage: {
      height: 1,
      width: 1,
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
    offlineNotice: {
      alignItems: "center",
      backgroundColor: authControlStyles.colors.ink60,
      borderRadius: 10,
      flexDirection: "row",
      gap: 8,
      marginHorizontal: 20,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    offlineNoticeText: {
      color: "#ffffff",
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
    },
    keepAliveEntryHidden: {
      left: 0,
      opacity: 0,
      position: "absolute",
      right: 0,
      top: 0,
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
      alignItems: "center",
      borderColor: "rgba(193, 22, 22, 0.18)",
      borderWidth: 1,
      justifyContent: "center",
      height: 34,
      width: 34,
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
