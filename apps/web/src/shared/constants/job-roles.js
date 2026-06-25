const DEFAULT_LANGUAGE = "zh";

export const STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES = [
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
];

export const REGIONAL_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES = [
  "store-manager",
  ...STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES,
];

export const STORE_ASSIGNABLE_JOB_ROLE_VALUES = STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES;

const ORGANIZATION_JOB_ROLE_VALUES = [
  "holding",
  "regional-manager",
  "store-manager",
  "front-manager",
  "back-manager",
  "front-assistant",
  "back-assistant",
];

const LEGACY_JOB_ROLE_VALUES = ["front-of-house", "back-of-house"];

const JOB_ROLE_ORDER = [
  ...ORGANIZATION_JOB_ROLE_VALUES,
  "front-of-house",
  "front-host",
  "front-cashier",
  "front-server",
  "front-packer",
  "front-bar",
  "back-of-house",
  "back-dishwasher",
  "back-noodle",
  "back-hot-appetizer",
  "back-cold-appetizer",
  "back-rice",
];

const JOB_ROLE_LABELS = {
  zh: {
    holding: "总部",
    "regional-manager": "区域经理",
    "store-manager": "店长",
    "front-manager": "前厅经理",
    "back-manager": "后厨经理",
    "front-assistant": "前厅助理",
    "back-assistant": "后厨助理",
    "front-of-house": "前厅",
    "front-host": "迎宾",
    "front-cashier": "收银",
    "front-server": "服务生",
    "front-packer": "打包",
    "front-bar": "吧台",
    "back-of-house": "后厨",
    "back-dishwasher": "洗碗",
    "back-noodle": "打面",
    "back-hot-appetizer": "热前菜",
    "back-cold-appetizer": "冷前菜",
    "back-rice": "饭",
  },
  en: {
    holding: "Holding",
    "regional-manager": "Regional manager",
    "store-manager": "Store manager",
    "front-manager": "Front manager",
    "back-manager": "Kitchen manager",
    "front-assistant": "Front assistant",
    "back-assistant": "Kitchen assistant",
    "front-of-house": "Front of house",
    "front-host": "Host",
    "front-cashier": "Cashier",
    "front-server": "Server",
    "front-packer": "Packing",
    "front-bar": "Bar",
    "back-of-house": "Kitchen",
    "back-dishwasher": "Dishwasher",
    "back-noodle": "Noodle station",
    "back-hot-appetizer": "Hot appetizers",
    "back-cold-appetizer": "Cold appetizers",
    "back-rice": "Rice station",
  },
  fr: {
    holding: "Holding",
    "regional-manager": "Manager regional",
    "store-manager": "Gerant",
    "front-manager": "Responsable salle",
    "back-manager": "Responsable cuisine",
    "front-assistant": "Assistant salle",
    "back-assistant": "Assistant cuisine",
    "front-of-house": "Salle",
    "front-host": "Accueil",
    "front-cashier": "Caisse",
    "front-server": "Serveur",
    "front-packer": "Emballage",
    "front-bar": "Bar",
    "back-of-house": "Cuisine",
    "back-dishwasher": "Plonge",
    "back-noodle": "Nouilles",
    "back-hot-appetizer": "Entrees chaudes",
    "back-cold-appetizer": "Entrees froides",
    "back-rice": "Riz",
  },
};

const JOB_ROLE_GROUP_LABELS = {
  zh: {
    organization: "管理岗位",
    front: "前厅",
    back: "后厨",
    legacy: "历史大类",
  },
  en: {
    organization: "Management",
    front: "Front of house",
    back: "Kitchen",
    legacy: "Legacy groups",
  },
  fr: {
    organization: "Encadrement",
    front: "Salle",
    back: "Cuisine",
    legacy: "Anciennes familles",
  },
};

function getLabels(lang) {
  return JOB_ROLE_LABELS[lang] || JOB_ROLE_LABELS[DEFAULT_LANGUAGE];
}

function getGroupLabels(lang) {
  return JOB_ROLE_GROUP_LABELS[lang] || JOB_ROLE_GROUP_LABELS[DEFAULT_LANGUAGE];
}

function toOption(value, lang) {
  return {
    value,
    label: getJobRoleLabel(value, lang),
  };
}

function toGroup(id, values, lang) {
  const labels = getGroupLabels(lang);

  return {
    id,
    label: labels[id],
    options: values.map((value) => toOption(value, lang)),
  };
}

export function parseJobRoleValues(jobRole) {
  return `${jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

export function normalizeJobRoleValues(values) {
  const uniqueValues = [...new Set((values || []).filter(Boolean))];

  return uniqueValues.sort((left, right) => {
    const leftIndex = JOB_ROLE_ORDER.indexOf(left);
    const rightIndex = JOB_ROLE_ORDER.indexOf(right);
    const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    return normalizedLeftIndex - normalizedRightIndex || left.localeCompare(right);
  });
}

export function normalizeJobRoleString(jobRole) {
  return normalizeJobRoleValues(parseJobRoleValues(jobRole)).join(",");
}

export function getJobRoleLabel(value, lang = DEFAULT_LANGUAGE) {
  return getLabels(lang)[value] || value;
}

export function formatJobRoleLabel(jobRole, lang = DEFAULT_LANGUAGE, fallback = "-") {
  const values = parseJobRoleValues(jobRole);

  if (values.length === 0) {
    return fallback;
  }

  return normalizeJobRoleValues(values)
    .map((value) => getJobRoleLabel(value, lang))
    .join(" / ");
}

export function getStoreJobRoleGroups(lang = DEFAULT_LANGUAGE) {
  return [
    toGroup(
      "front",
      ["front-host", "front-cashier", "front-server", "front-packer", "front-bar"],
      lang,
    ),
    toGroup(
      "back",
      ["back-dishwasher", "back-noodle", "back-hot-appetizer", "back-cold-appetizer", "back-rice"],
      lang,
    ),
  ];
}

export function getOrganizationJobRoleGroups(lang = DEFAULT_LANGUAGE) {
  return [
    toGroup("organization", ORGANIZATION_JOB_ROLE_VALUES, lang),
    ...getStoreJobRoleGroups(lang),
    toGroup("legacy", LEGACY_JOB_ROLE_VALUES, lang),
  ];
}
