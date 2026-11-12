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
  return !getJobRoleValues(jobRole).some((role) => ORGANIZATION_JOB_ROLE_VALUES.has(role));
}

const PROGRESS_DATE_LOCALES = { zh: "zh-CN", en: "en-GB", fr: "fr-FR" };

export function formatProgressDate(iso, lang = "zh") {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(PROGRESS_DATE_LOCALES[lang] ?? "zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

export function getProgressScope(roleValues) {
  if (roleValues.includes("holding")) {
    return {
      canView: true,
      canManageStoreJobRoles: false,
      key: "all",
    };
  }

  if (roleValues.includes("regional-manager")) {
    return {
      canView: true,
      canManageStoreJobRoles: true,
      key: "assigned",
    };
  }

  if (roleValues.includes("store-manager")) {
    return {
      canView: true,
      canManageStoreJobRoles: true,
      key: "store",
    };
  }

  return {
    canView: false,
    canManageStoreJobRoles: false,
    key: "self",
  };
}

export function getStoreKey(employee) {
  return String(employee.restaurant?.id ?? "unknown");
}

export function getStoreLabel(employee) {
  return employee.restaurant?.name || "";
}

export function groupUsersByStore(users) {
  const groupsByStoreId = new Map();

  for (const employee of users) {
    const storeId = getStoreKey(employee);
    const current = groupsByStoreId.get(storeId) ?? {
      id: storeId,
      name: getStoreLabel(employee),
      isUnassigned: !employee.restaurant?.name,
      users: [],
    };

    current.users.push(employee);
    groupsByStoreId.set(storeId, current);
  }

  return [...groupsByStoreId.values()].sort(
    (left, right) =>
      Number(left.isUnassigned) - Number(right.isUnassigned) ||
      left.name.localeCompare(right.name, "zh-CN"),
  );
}

export function matchesEmployeeSearch(employee, query) {
  if (!query) {
    return true;
  }

  const roleLabels = ["zh", "en", "fr"].map((lang) => formatJobRoleLabel(employee.jobRole, lang));
  const storeLabel = getStoreLabel(employee);
  const haystack = [employee.name, employee.email, employee.jobRole, ...roleLabels, storeLabel]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}
