import * as Haptics from "expo-haptics";

export function triggerSuccessFeedback(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function triggerWarningFeedback(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
