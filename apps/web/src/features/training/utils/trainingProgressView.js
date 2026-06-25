import { formatJobRoleLabel } from "@/shared/constants/job-roles";

const ORGANIZATION_JOB_ROLE_VALUES = new Set([
  "holding",
  "regional-manager",
  "store-manager",
  "front-manager",
  "back-manager",
  "front-assistant",
  "back-assistant",
]);

export function getUserRoleValues(user) {
  return `${user?.jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

export function getJobRoleValues(jobRole) {
  return `${jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

export function canEditStoreJobRoles(jobRole) {
  return !getJobRoleValues(jobRole).some((role) =>
    ORGANIZATION_JOB_ROLE_VALUES.has(role),
  );
}

export function formatProgressDate(iso) {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

export function getProgressScope(roleValues) {
  if (roleValues.includes("holding")) {
    return {
      canView: true,
      canManageStoreJobRoles: false,
      title: "全部门店进度",
      titleEn: "All stores training progress",
    };
  }

  if (roleValues.includes("regional-manager")) {
    return {
      canView: true,
      canManageStoreJobRoles: true,
      title: "负责门店进度",
      titleEn: "Assigned stores training progress",
    };
  }

  if (roleValues.includes("store-manager")) {
    return {
      canView: true,
      canManageStoreJobRoles: true,
      title: "本店进度",
      titleEn: "Store training progress",
    };
  }

  return {
    canView: false,
    canManageStoreJobRoles: false,
    title: "培训进度",
    titleEn: "Training progress",
  };
}

export function getStoreKey(employee) {
  return String(employee.restaurant?.id ?? "unknown");
}

export function getStoreLabel(employee) {
  return employee.restaurant?.name || "未分配门店";
}

export function groupUsersByStore(users) {
  const groupsByStoreId = new Map();

  for (const employee of users) {
    const storeId = getStoreKey(employee);
    const current = groupsByStoreId.get(storeId) ?? {
      id: storeId,
      name: getStoreLabel(employee),
      users: [],
    };

    current.users.push(employee);
    groupsByStoreId.set(storeId, current);
  }

  return [...groupsByStoreId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "zh-CN"),
  );
}

export function matchesEmployeeSearch(employee, query) {
  if (!query) {
    return true;
  }

  const roleLabel = formatJobRoleLabel(employee.jobRole, "zh");
  const storeLabel = getStoreLabel(employee);
  const haystack = [
    employee.name,
    employee.email,
    employee.jobRole,
    roleLabel,
    storeLabel,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}
