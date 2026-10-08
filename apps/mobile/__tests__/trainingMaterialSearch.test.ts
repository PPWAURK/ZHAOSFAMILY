import { buildTrainingMapData } from "@/features/training/trainingMapState";
import { buildTrainingMaterialSearchResults } from "@/features/training/trainingMaterialSearch";
import type {
  TrainingMaterialProgress,
  TrainingPlan,
  TrainingPlanMaterial,
} from "@/features/training/trainingTypes";

function buildProgress(
  materialId: number,
  overrides: Partial<TrainingMaterialProgress> = {},
): TrainingMaterialProgress {
  return {
    materialId,
    status: "not_started",
    progressPct: 0,
    lastOpenedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function buildMaterial(
  id: number,
  overrides: Partial<TrainingPlanMaterial> = {},
): TrainingPlanMaterial {
  return {
    id,
    positionId: "ALL",
    positionLabel: "All team",
    type: "PDF",
    isRequired: true,
    title: `Material ${id}`,
    description: null,
    originalName: `material-${id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: "1024",
    bucket: "training",
    objectKey: `training/material-${id}.pdf`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    progress: buildProgress(id),
    hasQuiz: false,
    ...overrides,
  };
}

function buildPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    positionCodes: ["ALL", "FOH"],
    required: [],
    optional: [],
    summary: {
      requiredTotal: 0,
      requiredCompleted: 0,
      completionPercent: 0,
    },
    ...overrides,
  };
}

describe("buildTrainingMaterialSearchResults", () => {
  it("matches full and partial file names, including extensions, without case sensitivity", () => {
    const mapData = buildTrainingMapData(
      buildPlan({
        required: [
          buildMaterial(1, { originalName: "Opening-Service-Guide.PDF" }),
          buildMaterial(2, { originalName: "welcome-video.MP4" }),
        ],
      }),
    );

    expect(buildTrainingMaterialSearchResults(mapData, "service-guide")).toHaveLength(1);
    expect(buildTrainingMaterialSearchResults(mapData, "WELCOME-VIDEO.MP4")).toHaveLength(1);
    expect(
      buildTrainingMaterialSearchResults(mapData, ".pdf").map((item) => item.node.material.id),
    ).toEqual([1]);
  });

  it("matches titles and normalizes surrounding whitespace and Unicode", () => {
    const mapData = buildTrainingMapData(
      buildPlan({
        required: [
          buildMaterial(1, {
            title: "Service d’accueil",
            originalName: "Re\u0301sume\u0301-Formation.PDF",
          }),
        ],
      }),
    );

    expect(buildTrainingMaterialSearchResults(mapData, "  ACCUEIL  ")).toHaveLength(1);
    expect(buildTrainingMaterialSearchResults(mapData, "  RÉSUMÉ-FORMATION.pdf ")).toHaveLength(1);
  });

  it("does not search descriptions, storage keys, or an empty query", () => {
    const mapData = buildTrainingMapData(
      buildPlan({
        required: [
          buildMaterial(1, {
            description: "hidden phrase",
            objectKey: "training/private/storage-key.pdf",
          }),
        ],
      }),
    );

    expect(buildTrainingMaterialSearchResults(mapData, "hidden phrase")).toEqual([]);
    expect(buildTrainingMaterialSearchResults(mapData, "storage-key")).toEqual([]);
    expect(buildTrainingMaterialSearchResults(mapData, "   ")).toEqual([]);
  });

  it("keeps map order and carries each layer's unlocked state", () => {
    const mapData = buildTrainingMapData(
      buildPlan({
        required: [
          buildMaterial(1, {
            title: "Indexed shared",
            progress: buildProgress(1, {
              status: "completed",
              progressPct: 100,
              completedAt: "2026-01-02T00:00:00.000Z",
            }),
          }),
          buildMaterial(2, {
            positionId: "FOH",
            positionLabel: "Front of house",
            title: "Indexed required",
          }),
        ],
        optional: [
          buildMaterial(3, {
            isRequired: false,
            positionId: "FOH",
            positionLabel: "Front of house",
            title: "Indexed advanced",
          }),
        ],
      }),
    );

    const results = buildTrainingMaterialSearchResults(mapData, "indexed");

    expect(results.map((item) => item.node.material.id)).toEqual([1, 2, 3]);
    expect(results.map((item) => item.layer)).toEqual(["shared", "required", "advanced"]);
    expect(results.map((item) => item.unlocked)).toEqual([true, true, false]);
    expect(results[1]?.positionLabel).toBe("Front of house");
  });

  it("keeps required and advanced results locked until shared learning is complete", () => {
    const mapData = buildTrainingMapData(
      buildPlan({
        required: [
          buildMaterial(1, { title: "Indexed shared" }),
          buildMaterial(2, {
            positionId: "FOH",
            title: "Indexed required",
          }),
        ],
        optional: [
          buildMaterial(3, {
            isRequired: false,
            positionId: "FOH",
            title: "Indexed advanced",
          }),
        ],
      }),
    );

    expect(
      buildTrainingMaterialSearchResults(mapData, "indexed").map((item) => item.unlocked),
    ).toEqual([true, false, false]);
  });
});
