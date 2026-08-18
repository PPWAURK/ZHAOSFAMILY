import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FeedbackPressable } from "@/components/FeedbackPressable";

type ContentStateProps = {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
};

export function EmptyState({
  actionLabel,
  description,
  onAction,
  title,
}: ContentStateProps): ReactNode {
  return (
    <ContentState
      actionLabel={actionLabel}
      description={description}
      onAction={onAction}
      title={title}
    />
  );
}

export function ErrorState({
  actionLabel,
  description,
  onAction,
  title,
}: ContentStateProps): ReactNode {
  return (
    <ContentState
      actionLabel={actionLabel}
      description={description}
      onAction={onAction}
      title={title}
    />
  );
}

function ContentState({ actionLabel, description, onAction, title }: ContentStateProps): ReactNode {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <FeedbackPressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </FeedbackPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 32 },
  title: { color: "#0a0a0a", fontSize: 17, fontWeight: "700", textAlign: "center" },
  description: {
    color: "rgba(10, 10, 10, 0.64)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  action: { backgroundColor: "#c11616", marginTop: 8, paddingHorizontal: 16, paddingVertical: 11 },
  actionText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});
