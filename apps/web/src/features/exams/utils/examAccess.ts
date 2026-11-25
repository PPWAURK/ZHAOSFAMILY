export type ExamPermission = "exam.bank.manage" | "exam.result.view" | "exam.session.manage";

export function hasExamPermission(
  user: { permissions?: string[] } | null | undefined,
  permission: ExamPermission,
): boolean {
  return Boolean(user?.permissions?.includes(permission));
}

/** Examiners run sessions; question-bank admins can run and see every session. */
export function canRunSessions(user: { permissions?: string[] } | null | undefined): boolean {
  return (
    hasExamPermission(user, "exam.session.manage") || hasExamPermission(user, "exam.bank.manage")
  );
}
