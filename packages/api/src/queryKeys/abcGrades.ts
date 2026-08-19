export const abcGradeQueryKeys = {
  all: ["abc-grades"] as const,
  board: (cycleId: number | string) => ["abc-grades", "board", String(cycleId)] as const,
  cycles: () => ["abc-grades", "cycles"] as const,
  latest: () => ["abc-grades", "board", "latest"] as const,
};
