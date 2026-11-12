import type { TrainingPlanMaterial } from "@/features/training/trainingTypes";

export type TrainingLibraryFolder = {
  positionId: string;
  label: string;
  materials: TrainingPlanMaterial[];
  totalCount: number;
  completedCount: number;
};

export function groupLibraryByPosition(
  materials: readonly TrainingPlanMaterial[],
): TrainingLibraryFolder[] {
  const buckets = new Map<string, TrainingPlanMaterial[]>();

  for (const material of materials) {
    buckets.set(material.positionId, [
      ...(buckets.get(material.positionId) ?? []),
      material,
    ]);
  }

  return [...buckets.entries()]
    .map(([positionId, items]) => ({
      positionId,
      label: items[0]?.positionLabel || positionId,
      materials: items,
      totalCount: items.length,
      completedCount: items.filter(
        (item) => item.progress.status === "completed",
      ).length,
    }))
    .sort((left, right) => {
      const leftPending = left.completedCount < left.totalCount;
      const rightPending = right.completedCount < right.totalCount;

      return (
        Number(rightPending) - Number(leftPending) ||
        left.label.localeCompare(right.label)
      );
    });
}
