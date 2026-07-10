import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AuthLanguage } from "@/features/auth/authCopy";
import type { TRAINING_COPY } from "@/features/training/trainingCopy";
import { TrainingBadgeSvg } from "@/features/training/TrainingBadgeSvg";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type { TrainingBadge } from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type TrainingBadgeUnlockModalProps = {
  badges: TrainingBadge[];
  copy: TrainingCopySet;
  language: AuthLanguage;
  onClose: () => void;
};

function getBadgeName(badge: TrainingBadge, language: AuthLanguage): string {
  return badge.name[language] || badge.name.zh || badge.code;
}

function getBadgeDescription(
  badge: TrainingBadge,
  language: AuthLanguage,
): string | null {
  return badge.description[language] || badge.description.zh || null;
}

export function TrainingBadgeUnlockModal({
  badges,
  copy,
  language,
  onClose,
}: TrainingBadgeUnlockModalProps) {
  const [areDetailsVisible, setAreDetailsVisible] = useState(false);

  if (badges.length === 0) return null;

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <Pressable style={styles.badgeUnlockBackdrop} onPress={onClose}>
        <Pressable style={styles.badgeUnlockCard} onPress={() => {}}>
          <Text style={styles.badgeUnlockKicker}>{copy.badgeUnlockedKicker}</Text>
          <Text style={styles.badgeUnlockTitle}>{copy.badgeUnlockedTitle}</Text>
          <Text style={styles.badgeUnlockIntro}>{copy.badgeUnlockedIntro}</Text>

          <ScrollView
            contentContainerStyle={styles.badgeUnlockList}
            showsVerticalScrollIndicator={false}
          >
            {badges.map((badge) => {
              const description = getBadgeDescription(badge, language);
              const requirementCount = badge.requirements.length;

              return (
                <View key={badge.code} style={styles.badgeUnlockItem}>
                  <TrainingBadgeSvg badge={badge} size={104} />
                  <Text style={styles.badgeUnlockName}>
                    {getBadgeName(badge, language)}
                  </Text>
                  {description ? (
                    <Text style={styles.badgeUnlockDescription}>{description}</Text>
                  ) : null}
                  {requirementCount > 0 ? (
                    <>
                      <Text style={styles.badgeUnlockReason}>
                        {copy.badgeUnlockedReasonSummary.replace(
                          "{count}",
                          String(requirementCount),
                        )}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        style={styles.badgeUnlockDetailsButton}
                        onPress={() => setAreDetailsVisible((visible) => !visible)}
                      >
                        <Text style={styles.badgeUnlockDetailsText}>
                          {areDetailsVisible
                            ? copy.badgeUnlockedHideDetails
                            : copy.badgeUnlockedDetails}
                        </Text>
                        <Ionicons
                          color={styles.badgeUnlockDetailsText.color}
                          name={areDetailsVisible ? "chevron-up" : "chevron-down"}
                          size={16}
                        />
                      </Pressable>
                      {areDetailsVisible ? (
                        <View style={styles.badgeUnlockRequirements}>
                          {badge.requirements.map((requirement) => (
                            <Text key={requirement.materialId} style={styles.badgeUnlockRequirement}>
                              {requirement.title}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <Pressable style={styles.badgeUnlockCloseButton} onPress={onClose}>
            <Text style={styles.badgeUnlockCloseText}>{copy.badgeUnlockedClose}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
