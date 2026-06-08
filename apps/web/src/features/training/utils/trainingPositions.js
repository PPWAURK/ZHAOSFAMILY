import { TRAINING_POSITIONS } from "@/features/training/constants/training-copy";

export const TRAINING_POSITION_MANAGE_PERMISSION = "training.position.manage";

function toDefaultTrainingPosition(position) {
  return {
    code: position.id,
    name: {
      zh: position.name,
      en: position.en,
      fr: position.fr || position.en,
    },
    parentCode: position.parentCode || null,
    isActive: true,
    sortOrder: Number(position.code?.replace("POS-", "")) || 0,
    desc: position.desc,
    children: [],
  };
}

function buildDefaultTrainingPositionTree(positions) {
  const nodes = new Map(
    positions.map((position) => [position.id, toDefaultTrainingPosition(position)]),
  );
  const roots = [];

  for (const node of nodes.values()) {
    if (node.parentCode && nodes.has(node.parentCode)) {
      nodes.get(node.parentCode).children.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots;
}

export const DEFAULT_TRAINING_POSITION_TREE =
  buildDefaultTrainingPositionTree(TRAINING_POSITIONS);

const JOB_ROLE_POSITION_CODE_BY_ROLE = new Map([
  ["front-host", "FRONT_HOST"],
  ["front-cashier", "FRONT_CASHIER"],
  ["front-server", "FRONT_SERVER"],
  ["front-packer", "FRONT_PACKER"],
  ["front-bar", "FRONT_BAR"],
  ["back-dishwasher", "BACK_DISHWASHER"],
  ["back-noodle", "BACK_NOODLE"],
  ["back-hot-appetizer", "BACK_HOT_APPETIZER"],
  ["back-cold-appetizer", "BACK_COLD_APPETIZER"],
  ["back-rice", "BACK_RICE"],
]);

export function flattenTrainingPositions(positions) {
  return positions.flatMap((position) => [
    position,
    ...flattenTrainingPositions(position.children || []),
  ]);
}

function cloneTrainingPosition(position) {
  return {
    ...position,
    name: { ...(position.name || {}) },
    children: (position.children || []).map(cloneTrainingPosition),
  };
}

export function mergeDefaultTrainingPositions(positions) {
  const positionsByCode = new Map();

  for (const position of [
    ...flattenTrainingPositions(DEFAULT_TRAINING_POSITION_TREE),
    ...flattenTrainingPositions(positions || []),
  ]) {
    const current = positionsByCode.get(position.code);

    positionsByCode.set(position.code, {
      ...cloneTrainingPosition(current || position),
      ...cloneTrainingPosition(position),
      children: [],
    });
  }

  const roots = [];

  for (const node of positionsByCode.values()) {
    if (node.parentCode && positionsByCode.has(node.parentCode)) {
      positionsByCode.get(node.parentCode).children.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots.sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getTrainingPositionLabel(position, lang = "zh") {
  if (!position) {
    return "";
  }

  return position.name?.[lang] || position.name?.zh || position.code;
}

export function getTrainingPositionSecondaryLabel(position, lang = "zh") {
  if (!position) {
    return "";
  }

  return lang === "en" ? position.name?.zh : position.name?.en;
}

export function findTrainingPosition(positions, code) {
  return flattenTrainingPositions(positions).find((position) => position.code === code);
}

function getRoleValues(user) {
  return `${user?.jobRole || user?.position || user?.role || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function getStorePositionCodes(positions) {
  return flattenTrainingPositions(positions)
    .map((position) => position.code)
    .filter((code) => !["ALL", "HOLDING", "RM"].includes(code));
}

function getAllLearningPositionCodes(positions) {
  return flattenTrainingPositions(positions).map((position) => position.code);
}

export function mergeMaterialPositionTabs(positions, materials) {
  const codes = new Set(flattenTrainingPositions(positions).map((position) => position.code));
  const missingPositions = materials
    .map((material) => material.positionId)
    .filter((code) => code && !codes.has(code))
    .filter((code, index, allCodes) => allCodes.indexOf(code) === index)
    .map((code, index) => ({
      code,
      name: { zh: code, en: code, fr: code },
      parentCode: null,
      isActive: false,
      sortOrder: 900 + index,
      children: [],
    }));

  return [...positions, ...missingPositions];
}

export function getUserTrainingPositionCodes(user, positions) {
  const codes = new Set();

  getRoleValues(user).forEach((roleValue) => {
    const role = roleValue.toLowerCase();
    const mappedPositionCode = JOB_ROLE_POSITION_CODE_BY_ROLE.get(role);
    const mappedPosition = mappedPositionCode
      ? findTrainingPosition(positions, mappedPositionCode)
      : null;
    const explicitPosition = findTrainingPosition(positions, roleValue.toUpperCase());

    if (mappedPosition?.parentCode) {
      codes.add(mappedPosition.code);
      codes.add(mappedPosition.parentCode);
      return;
    }

    if (mappedPosition?.code) {
      codes.add(mappedPosition.code);
      return;
    }

    if (role.includes("holding") || role.includes("headquarter") || role.includes("hq")) {
      codes.add("HOLDING");
      return;
    }

    if (
      role.includes("regional") ||
      role.includes("rm") ||
      role === "store-manager" ||
      role.includes("manager") ||
      role.includes("store") ||
      role.includes("sm")
    ) {
      getAllLearningPositionCodes(positions).forEach((code) => codes.add(code));
      return;
    }

    if (role.includes("all-rounder")) {
      getStorePositionCodes(positions)
        .filter((code) => code !== "SM")
        .forEach((code) => codes.add(code));
      return;
    }

    if (
      role.includes("kitchen") ||
      role.includes("boh") ||
      role.includes("chef") ||
      role.includes("back-of-house") ||
      role.includes("back-assistant") ||
      role.includes("back-dishwasher") ||
      role.includes("back-noodle") ||
      role.includes("back-hot-appetizer") ||
      role.includes("back-cold-appetizer") ||
      role.includes("back-rice")
    ) {
      codes.add("BOH");
      return;
    }

    if (role === "cash") {
      codes.add("CASH");
      return;
    }

    if (explicitPosition?.parentCode) {
      codes.add(explicitPosition.code);
      codes.add(explicitPosition.parentCode);
      return;
    }

    if (explicitPosition?.code) {
      codes.add(explicitPosition.code);
      (explicitPosition.children || []).forEach((child) => codes.add(child.code));
      return;
    }

    if (
      role.includes("front-of-house") ||
      role.includes("front-assistant") ||
      role.includes("front-server") ||
      role.includes("front-host") ||
      role.includes("front-cashier") ||
      role.includes("front-packer") ||
      role.includes("front-bar")
    ) {
      codes.add("FOH");
    }
  });

  if (codes.size === 0) {
    codes.add("FOH");
  }

  codes.add("ALL");

  return codes;
}
