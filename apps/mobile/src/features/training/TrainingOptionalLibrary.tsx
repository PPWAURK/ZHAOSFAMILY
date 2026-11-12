import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import { TRAINING_COPY } from "@/features/training/trainingCopy";
import { getTrainingPositionLabel } from "@/features/training/trainingPositionLabels";
import { OptionalLibraryCard } from "@/features/training/TrainingGuidedPlan";
import { RevealList } from "@/features/training/TrainingFolderReveal";
import { trainingFolderStyles as folderStyles } from "@/features/training/trainingFolderStyles";
import { groupLibraryByPosition } from "@/features/training/trainingLibraryFolders";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type { TrainingPlan, TrainingPlanMaterial } from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type TrainingOptionalLibraryProps = {
  copy: TrainingCopySet;
  plan: TrainingPlan;
  onOpenMaterial: (material: TrainingPlanMaterial) => void;
};

export function TrainingOptionalLibrary({
  copy,
  plan,
  onOpenMaterial,
}: TrainingOptionalLibraryProps) {
  const positionLabels = plan.positionCodes.map((code) =>
    getTrainingPositionLabel(code, plan.positionLabels || {}, copy),
  );
  const folders = useMemo(() => groupLibraryByPosition(plan.optional), [plan.optional]);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  function toggleFolder(positionId: string): void {
    const next = new Set(expandedIds);
    if (next.has(positionId)) {
      next.delete(positionId);
    } else {
      next.add(positionId);
    }
    setExpandedIds(next);
  }

  if (plan.optional.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.emptyText}>{copy.empty}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {positionLabels.length > 0 ? (
        <View style={styles.positionsBoard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.positions}</Text>
            <Text style={styles.sectionCount}>{positionLabels.length}</Text>
          </View>
          <View style={styles.pillRow}>
            {positionLabels.map((label) => (
              <View key={label} style={styles.pill}>
                <Text style={styles.pillText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{copy.guidedLibrary}</Text>
        <Text style={styles.sectionCount}>{plan.optional.length}</Text>
      </View>
      <View style={folderStyles.toolbar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpandedIds(new Set(folders.map((f) => f.positionId)))}
        >
          <Text style={folderStyles.toolbarAction}>{copy.libraryExpandAll}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setExpandedIds(new Set())}>
          <Text style={folderStyles.toolbarAction}>{copy.libraryCollapseAll}</Text>
        </Pressable>
      </View>
      <View style={folderStyles.grid}>
        {folders.map((folder) => {
          const isOpen = expandedIds.has(folder.positionId);
          const pct = Math.round((folder.completedCount / folder.totalCount) * 100);

          return (
            <View
              key={folder.positionId}
              style={[folderStyles.tile, isOpen ? folderStyles.tileOpen : null]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${folder.label}, ${folder.completedCount}/${folder.totalCount}`}
                accessibilityState={{ expanded: isOpen }}
                style={({ pressed }) => [
                  folderStyles.tileHead,
                  pressed ? folderStyles.tilePressed : null,
                ]}
                onPress={() => toggleFolder(folder.positionId)}
              >
                <View style={folderStyles.tileTop}>
                  <Ionicons
                    color={authControlStyles.colors.red}
                    name={isOpen ? "folder-open" : "folder"}
                    size={22}
                  />
                  <Text numberOfLines={2} style={folderStyles.tileName}>
                    {folder.label}
                  </Text>
                  <Ionicons
                    color={authControlStyles.colors.ink60}
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                  />
                </View>
                <Text style={folderStyles.tileCount}>
                  {folder.completedCount}/{folder.totalCount}
                </Text>
                <View style={folderStyles.tileTrack}>
                  <View style={[folderStyles.tileFill, { width: `${pct}%` }]} />
                </View>
              </Pressable>
              {isOpen ? (
                <View style={folderStyles.panel}>
                  <RevealList>
                    {folder.materials.map((material) => (
                      <OptionalLibraryCard
                        key={`${material.id}-${material.positionId}`}
                        copy={copy}
                        material={material}
                        onOpen={onOpenMaterial}
                      />
                    ))}
                  </RevealList>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
