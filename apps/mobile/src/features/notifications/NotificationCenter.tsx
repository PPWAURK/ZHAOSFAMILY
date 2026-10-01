import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, PanResponder, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import type { NotificationItem } from "@zhao/types";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import { FeedbackPressable } from "@/components/FeedbackPressable";
import { Skeleton } from "@/components/Skeleton";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { resolveNotificationEntry, type NotificationEntry } from "@/lib/useNotificationNavigation";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notificationsApi";
import { NOTIFICATIONS_COPY, formatRelativeTime } from "./notificationsCopy";

const UNREAD_POLL_INTERVAL_MS = 45000;
const MAX_BADGE_COUNT = 99;
const INITIAL_SHEET_HEIGHT_RATIO = 0.8;
const SHEET_DISMISS_DISTANCE_RATIO = 0.2;
const colors = authControlStyles.colors;
const screenHeight = Dimensions.get("window").height;

type NotificationCenterProps = {
  language: AuthLanguage;
  onOpenEntry: (entry: NotificationEntry) => void;
};

export function NotificationCenter({ language, onOpenEntry }: NotificationCenterProps) {
  const copy = NOTIFICATIONS_COPY[language];
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const sheetHeight = useRef(new Animated.Value(screenHeight * INITIAL_SHEET_HEIGHT_RATIO)).current;
  const dragStartHeight = useRef(screenHeight * INITIAL_SHEET_HEIGHT_RATIO);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation((height) => {
          dragStartHeight.current = height;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const nextHeight = Math.max(
          screenHeight * 0.5,
          Math.min(screenHeight, dragStartHeight.current - gesture.dy),
        );
        sheetHeight.setValue(nextHeight);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > screenHeight * SHEET_DISMISS_DISTANCE_RATIO) {
          setIsOpen(false);
          sheetHeight.setValue(screenHeight * INITIAL_SHEET_HEIGHT_RATIO);
          return;
        }

        const shouldExpand = gesture.dy < -40 || gesture.vy < -0.5;
        Animated.spring(sheetHeight, {
          toValue: shouldExpand ? screenHeight : screenHeight * INITIAL_SHEET_HEIGHT_RATIO,
          useNativeDriver: false,
          bounciness: 0,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetHeight, {
          toValue: screenHeight * INITIAL_SHEET_HEIGHT_RATIO,
          useNativeDriver: false,
          bounciness: 0,
        }).start();
      },
    }),
  ).current;

  const refreshUnreadCount = useCallback(async () => {
    try {
      const { unreadCount: next } = await fetchUnreadCount();
      setUnreadCount(next);
    } catch {
      // Best-effort: a failed poll only means a stale badge, not a broken app.
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
    const timer = setInterval(() => void refreshUnreadCount(), UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshUnreadCount]);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const result = await fetchNotifications();
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openCenter = useCallback(() => {
    setIsOpen(true);
    void loadList();
  }, [loadList]);

  const handleMarkAll = useCallback(async () => {
    setItems((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })),
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      void refreshUnreadCount();
    }
  }, [refreshUnreadCount]);

  const handlePressItem = useCallback(
    async (item: NotificationItem) => {
      if (!item.readAt) {
        setItems((current) =>
          current.map((row) =>
            row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
          ),
        );
        try {
          const { unreadCount: next } = await markNotificationRead(item.id);
          setUnreadCount(next);
        } catch {
          void refreshUnreadCount();
        }
      }

      const entry = resolveNotificationEntry(item.type);
      if (entry) {
        setIsOpen(false);
        onOpenEntry(entry);
      }
    },
    [onOpenEntry, refreshUnreadCount],
  );

  return (
    <>
      <FeedbackPressable
        accessibilityLabel={copy.bellLabel}
        accessibilityRole="button"
        style={styles.bellButton}
        onPress={openCenter}
      >
        <Ionicons color={colors.red} name="notifications-outline" size={24} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unreadCount}
            </Text>
          </View>
        ) : null}
      </FeedbackPressable>

      <Modal
        animationType="slide"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.backdrop}>
          <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
            <SafeAreaView style={styles.sheetContent} edges={["top", "bottom"]}>
            <View style={styles.header} {...panResponder.panHandlers}>
              <Text style={styles.title}>{copy.title}</Text>
              <View style={styles.headerActions}>
                {items.some((item) => !item.readAt) ? (
                  <FeedbackPressable onPress={handleMarkAll} hitSlop={8}>
                    <Text style={styles.markAll}>{copy.markAll}</Text>
                  </FeedbackPressable>
                ) : null}
                <FeedbackPressable
                  accessibilityLabel={copy.close}
                  accessibilityRole="button"
                  onPress={() => setIsOpen(false)}
                  hitSlop={8}
                >
                  <Ionicons color={colors.ink} name="close" size={24} />
                </FeedbackPressable>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.stateBox}>
                <Skeleton style={styles.loadingSkeleton} />
              </View>
            ) : hasError ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>{copy.loadError}</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>{copy.empty}</Text>
              </View>
            ) : (
              <FlashList
                data={items}
                style={styles.list}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <FeedbackPressable
                    style={[styles.row, item.readAt ? null : styles.rowUnread]}
                    onPress={() => void handlePressItem(item)}
                  >
                    {item.readAt ? (
                      <View style={styles.dotSpacer} />
                    ) : (
                      <View style={styles.unreadDot} />
                    )}
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <Text style={styles.rowText}>{item.body}</Text>
                      <Text style={styles.rowTime}>{formatRelativeTime(item.createdAt, copy)}</Text>
                    </View>
                  </FeedbackPressable>
                )}
              />
            )}
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.paper, fontSize: 11, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(10, 10, 10, 0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  sheetContent: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.ink10,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  markAll: { fontSize: 13, fontWeight: "600", color: colors.red },
  stateBox: { flex: 1, paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  loadingSkeleton: { height: 72, width: "84%" },
  stateText: { fontSize: 14, color: colors.ink60 },
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.ink05,
  },
  rowUnread: { backgroundColor: colors.ink05 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: colors.red,
  },
  dotSpacer: { width: 8 },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  rowText: { fontSize: 14, color: colors.ink60, lineHeight: 19 },
  rowTime: { fontSize: 12, color: colors.ink40, marginTop: 2 },
});
