type TrainingAccessUser = {
  jobRole?: string | null;
  position?: string | null;
  role?: string | null;
};

export function hasHoldingJobRole(user: TrainingAccessUser | null | undefined): boolean {
  return `${user?.jobRole || user?.position || user?.role || ""}`
    .split(",")
    .map((role) => role.trim())
    .includes("holding");
}
