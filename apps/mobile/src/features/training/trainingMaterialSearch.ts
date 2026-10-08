import type {
  TrainingMapData,
  TrainingMapLayer,
  TrainingMapMaterialNode,
} from "@/features/training/trainingTypes";

export type TrainingMaterialSearchResult = {
  layer: TrainingMapLayer;
  node: TrainingMapMaterialNode;
  positionLabel?: string;
  unlocked: boolean;
};

function normalizeSearchValue(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function nodeMatchesSearch(node: TrainingMapMaterialNode, normalizedQuery: string): boolean {
  const searchableValues = [node.material.title, node.material.originalName];

  return searchableValues.some((value) =>
    normalizeSearchValue(value || "").includes(normalizedQuery),
  );
}

export function buildTrainingMaterialSearchResults(
  mapData: TrainingMapData,
  query: string,
): TrainingMaterialSearchResult[] {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) return [];

  const results: TrainingMaterialSearchResult[] = [];

  mapData.sharedMaterials.forEach((node) => {
    if (!nodeMatchesSearch(node, normalizedQuery)) return;

    results.push({
      layer: "shared",
      node,
      positionLabel: node.material.positionLabel,
      unlocked: mapData.layer1Unlocked,
    });
  });

  mapData.positionGates.forEach((gate) => {
    gate.materials.forEach((node) => {
      if (!nodeMatchesSearch(node, normalizedQuery)) return;

      results.push({
        layer: "required",
        node,
        positionLabel: gate.positionLabel,
        unlocked: mapData.layer2Unlocked,
      });
    });
  });

  mapData.advancedMaterials.forEach((node) => {
    if (!nodeMatchesSearch(node, normalizedQuery)) return;

    results.push({
      layer: "advanced",
      node,
      positionLabel: node.material.positionLabel,
      unlocked: mapData.layer3Unlocked,
    });
  });

  return results;
}
