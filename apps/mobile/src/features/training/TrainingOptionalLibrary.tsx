import { Text, View } from "react-native";
import { TRAINING_COPY } from "@/features/training/trainingCopy";
import { OptionalLibraryCard } from "@/features/training/TrainingGuidedPlan";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type {
  TrainingPlan,
  TrainingPlanMaterial,
} from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type TrainingOptionalLibraryProps = {
  copy: TrainingCopySet;
  plan: TrainingPlan;
  onOpenMaterial: (material: TrainingPlanMaterial) => void;
};

function getPositionLabel(
  code: string,
  labels: Record<string, string>,
): string {
  return labels[code] || code;
}

export function TrainingOptionalLibrary({
  copy,
  plan,
  onOpenMaterial,
}: TrainingOptionalLibraryProps) {
  const positionLabels = plan.positionCodes.map((code) =>
    getPositionLabel(code, copy.positionLabels),
  );

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
      <View style={styles.list}>
        {plan.optional.map((material) => (
          <OptionalLibraryCard
            key={`${material.id}-${material.positionId}`}
            copy={copy}
            material={material}
            onOpen={onOpenMaterial}
          />
        ))}
      </View>
    </View>
  );
}
