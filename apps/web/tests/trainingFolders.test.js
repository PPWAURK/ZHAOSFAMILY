import {
  UNCATEGORIZED_FOLDER_ID,
  groupByPosition,
} from "@/features/training/utils/trainingFolders";

function course(overrides) {
  return {
    id: `material-${overrides.materialId}`,
    materialId: 1,
    positionId: "SERVICE",
    req: false,
    status: "not_started",
    title: "t",
    ...overrides,
  };
}

describe("groupByPosition", () => {
  test("returns empty array when there are no courses", () => {
    expect(groupByPosition([])).toEqual([]);
  });

  test("groups courses by positionId", () => {
    const folders = groupByPosition([
      course({ materialId: 1, positionId: "KITCHEN" }),
      course({ materialId: 2, positionId: "SERVICE" }),
      course({ materialId: 3, positionId: "KITCHEN" }),
    ]);

    expect(folders.map((folder) => folder.positionId).sort()).toEqual([
      "KITCHEN",
      "SERVICE",
    ]);
    expect(
      folders.find((folder) => folder.positionId === "KITCHEN").courses,
    ).toHaveLength(2);
  });

  test("puts required courses before optional ones inside a folder", () => {
    const [folder] = groupByPosition([
      course({ materialId: 1, req: false, title: "b" }),
      course({ materialId: 2, req: true, title: "a" }),
    ]);

    expect(folder.courses.map((item) => item.materialId)).toEqual([2, 1]);
  });

  test("computes required, completed counts and percent", () => {
    const [folder] = groupByPosition([
      course({ materialId: 1, req: true, status: "completed" }),
      course({ materialId: 2, req: true, status: "in_progress" }),
      course({ materialId: 3, req: false, status: "completed" }),
    ]);

    expect(folder.totalCount).toBe(3);
    expect(folder.requiredCount).toBe(2);
    expect(folder.completedRequiredCount).toBe(1);
    expect(folder.pct).toBe(50);
  });

  test("reports 0 percent when a folder has no required courses", () => {
    const [folder] = groupByPosition([course({ materialId: 1, req: false })]);

    expect(folder.requiredCount).toBe(0);
    expect(folder.pct).toBe(0);
  });

  test("puts courses without positionId into the uncategorized folder", () => {
    const [folder] = groupByPosition([
      course({ materialId: 1, positionId: null }),
      course({ materialId: 2, positionId: "" }),
    ]);

    expect(folder.positionId).toBe(UNCATEGORIZED_FOLDER_ID);
    expect(folder.courses).toHaveLength(2);
  });

  test("sorts folders with unfinished required courses first, then by name", () => {
    const folders = groupByPosition([
      course({ materialId: 1, positionId: "A_DONE", req: true, status: "completed" }),
      course({ materialId: 2, positionId: "C_TODO", req: true }),
      course({ materialId: 3, positionId: "B_TODO", req: true }),
    ]);

    expect(folders.map((folder) => folder.positionId)).toEqual([
      "B_TODO",
      "C_TODO",
      "A_DONE",
    ]);
  });

  test("does not mutate the input array", () => {
    const input = [
      course({ materialId: 1, req: false }),
      course({ materialId: 2, req: true }),
    ];
    const snapshot = input.map((item) => item.materialId);

    groupByPosition(input);

    expect(input.map((item) => item.materialId)).toEqual(snapshot);
  });
});
