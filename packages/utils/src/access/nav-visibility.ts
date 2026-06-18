// 导航可见性：单一事实来源，web 与 mobile 共用。
// 可见性跟着「岗位」(user.jobRole) 走，同时保留原有的 RBAC 权限判断（OR 逻辑）。

export type NavVisibilityRule = {
  requiredPermission?: string;
  visibleForJobRoles?: readonly string[];
};

export type NavViewer = {
  jobRole?: string | null;
  position?: string | null;
  role?: string | null;
  permissions?: string[] | null;
};

// 全部岗位，来源：apps/backend/prisma/seed.js 的 TRAINING_JOB_ROLE_POSITIONS。
export const ALL_JOB_ROLES = [
  "holding",
  "regional-manager",
  "store-manager",
  "front-manager",
  "back-manager",
  "front-assistant",
  "back-assistant",
  "front-of-house",
  "back-of-house",
  "front-host",
  "front-cashier",
  "front-server",
  "front-packer",
  "front-bar",
  "back-dishwasher",
  "back-noodle",
  "back-hot-appetizer",
  "back-cold-appetizer",
  "back-rice",
] as const;

// 管理层岗位：可见运营类模块（门店 / 下单 / 供应商）。
export const MANAGEMENT_JOB_ROLES = [
  "holding",
  "regional-manager",
  "store-manager",
  "front-manager",
  "back-manager",
] as const;

// 总部层岗位：可见最敏感模块（库存 / 岗位管理 / 系统角色）。
export const HEADQUARTER_JOB_ROLES = ["holding", "regional-manager"] as const;

// 一个账号可同时挂多个岗位，存为逗号分隔字符串（如 "front-host,front-cashier"）。
export function resolveJobRoles(viewer: NavViewer): string[] {
  return `${viewer.jobRole || viewer.position || viewer.role || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

// 语义：
// - 既无岗位限制也无权限限制 => 所有人可见。
// - 否则只要满足任一条已声明的限制即可见（岗位命中 OR 持有权限）。
//   未声明的限制不参与判断（不会让条目对所有人开放）。
export function canSeeNavEntry(
  viewer: NavViewer,
  rule: NavVisibilityRule | undefined,
): boolean {
  if (!rule) return true;

  const hasJobRoleRule = (rule.visibleForJobRoles?.length ?? 0) > 0;
  const hasPermissionRule = Boolean(rule.requiredPermission);
  if (!hasJobRoleRule && !hasPermissionRule) {
    return true;
  }

  if (hasJobRoleRule) {
    const jobRoles = resolveJobRoles(viewer);
    if (rule.visibleForJobRoles!.some((role) => jobRoles.includes(role))) {
      return true;
    }
  }

  if (hasPermissionRule) {
    const permissions = viewer.permissions ?? [];
    if (permissions.includes(rule.requiredPermission!)) {
      return true;
    }
  }

  return false;
}
