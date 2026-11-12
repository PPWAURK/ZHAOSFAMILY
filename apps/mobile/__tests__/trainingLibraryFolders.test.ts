import { groupLibraryByPosition } from "@/features/training/trainingLibraryFolders";
import type { TrainingPlanMaterial } from "@/features/training/trainingTypes";

function material(
  id: number,
  overrides: Partial<TrainingPlanMaterial> = {},
  status = "not_started",
): TrainingPlanMaterial {
  return {
    id,
    positionId: "SERVICE",
    positionLabel: "Service",
    type: "PDF",
    isRequired: false,
    isPrintable: false,
    title: `M${id}`,
    description: null,
    originalName: `m${id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: "1",
    bucket: "b",
    objectKey: `k${id}`,
    createdAt: "",
    updatedAt: "",
    progress: {
      materialId: id,
      status,
      progressPct: 0,
      lastOpenedAt: null,
      completedAt: null,
    } as TrainingPlanMaterial["progress"],
    hasQuiz: false,
    ...overrides,
  };
}

describe("groupLibraryByPosition", () => {
  test("returns empty array for no materials", () => {
    expect(groupLibraryByPosition([])).toEqual([]);
  });

  test("groups by positionId and keeps the localized label", () => {
    const folders = groupLibraryByPosition([
      material(1, { positionId: "KITCHEN", positionLabel: "后厨" }),
      material(2, { positionId: "SERVICE", positionLabel: "服务" }),
      material(3, { positionId: "KITCHEN", positionLabel: "后厨" }),
    ]);

    const kitchen = folders.find((folder) => folder.positionId === "KITCHEN");
    expect(folders).toHaveLength(2);
    expect(kitchen?.label).toBe("后厨");
    expect(kitchen?.materials.map((item) => item.id)).toEqual([1, 3]);
  });

  test("counts completed materials", () => {
    const [folder] = groupLibraryByPosition([
      material(1, {}, "completed"),
      material(2, {}, "in_progress"),
    ]);

    expect(folder.totalCount).toBe(2);
    expect(folder.completedCount).toBe(1);
  });

  test("sorts folders with unfinished materials first, then by label", () => {
    const folders = groupLibraryByPosition([
      material(1, { positionId: "A", positionLabel: "A" }, "completed"),
      material(2, { positionId: "C", positionLabel: "C" }),
      material(3, { positionId: "B", positionLabel: "B" }),
    ]);

    expect(folders.map((folder) => folder.positionId)).toEqual(["B", "C", "A"]);
  });

  test("does not mutate the input array", () => {
    const input = [material(2), material(1)];
    groupLibraryByPosition(input);

    expect(input.map((item) => item.id)).toEqual([2, 1]);
  });
});
