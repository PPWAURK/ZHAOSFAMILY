export const UNCATEGORIZED_FOLDER_ID = "__uncategorized__";

export interface FolderCourse {
  id: string;
  materialId: number | string;
  positionId?: string | null;
  req: boolean;
  status: string;
  title: string;
  [key: string]: unknown;
}

export interface TrainingFolderGroup<T extends FolderCourse = FolderCourse> {
  positionId: string;
  courses: T[];
  totalCount: number;
  requiredCount: number;
  completedRequiredCount: number;
  pct: number;
}

function buildFolder<T extends FolderCourse>(
  positionId: string,
  items: readonly T[],
): TrainingFolderGroup<T> {
  const courses = [...items].sort(
    (left, right) => Number(right.req) - Number(left.req),
  );
  const required = courses.filter((course) => course.req);
  const completedRequiredCount = required.filter(
    (course) => course.status === "completed",
  ).length;

  return {
    positionId,
    courses,
    totalCount: courses.length,
    requiredCount: required.length,
    completedRequiredCount,
    pct:
      required.length === 0
        ? 0
        : Math.round((completedRequiredCount / required.length) * 100),
  };
}

function hasPendingRequired(folder: TrainingFolderGroup): boolean {
  return folder.completedRequiredCount < folder.requiredCount;
}

export function groupByPosition<T extends FolderCourse>(
  courses: readonly T[],
): TrainingFolderGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const course of courses) {
    const key = course.positionId?.trim() || UNCATEGORIZED_FOLDER_ID;
    buckets.set(key, [...(buckets.get(key) ?? []), course]);
  }

  return [...buckets.entries()]
    .map(([positionId, items]) => buildFolder(positionId, items))
    .sort((left, right) => {
      const pendingDiff =
        Number(hasPendingRequired(right)) - Number(hasPendingRequired(left));
      return pendingDiff || left.positionId.localeCompare(right.positionId);
    });
}
