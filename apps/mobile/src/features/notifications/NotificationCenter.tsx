import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NotificationItem } from "@zhao/types";
import { authControlStyles } from "@/features/auth/AuthFormControls";
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
const colors = authControlStyles.colors;

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
      <Pressable
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
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.sheet} edges={["top", "bottom"]}>
            <View style={styles.header}>
              <Text style={styles.title}>{copy.title}</Text>
              <View style={styles.headerActions}>
                {items.some((item) => !item.readAt) ? (
                  <Pressable onPress={handleMarkAll} hitSlop={8}>
                    <Text style={styles.markAll}>{copy.markAll}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel={copy.close}
                  accessibilityRole="button"
                  onPress={() => setIsOpen(false)}
                  hitSlop={8}
                >
                  <Ionicons color={colors.ink} name="close" size={24} />
                </Pressable>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.red} />
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
              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <Pressable
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
                  </Pressable>
                )}
              />
            )}
          </SafeAreaView>
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
    maxHeight: "80%",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
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
  stateBox: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  stateText: { fontSize: 14, color: colors.ink60 },
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
