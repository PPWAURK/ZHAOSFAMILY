import { TRAINING_POSITIONS } from "@/features/training/constants/training-copy";

export const TRAINING_POSITION_MANAGE_PERMISSION = "training.position.manage";

export const DEFAULT_TRAINING_POSITION_TREE = TRAINING_POSITIONS.map((position) => ({
  code: position.id,
  name: {
    zh: position.name,
    en: position.en,
    fr: position.en,
  },
  parentCode: null,
  isActive: true,
  sortOrder: Number(position.code?.replace("POS-", "")) || 0,
  desc: position.desc,
  children: [],
}));

export function flattenTrainingPositions(positions) {
  return positions.flatMap((position) => [
    position,
    ...flattenTrainingPositions(position.children || []),
  ]);
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
    const explicitPosition = findTrainingPosition(positions, roleValue.toUpperCase());
    const role = roleValue.toLowerCase();

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

    if (role.includes("kitchen") || role.includes("boh") || role.includes("chef")) {
      codes.add("BOH");
      return;
    }

    if (role.includes("cash")) {
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

    if (role.includes("front-of-house")) {
      codes.add("FOH");
    }
  });

  if (codes.size === 0) {
    codes.add("FOH");
  }

  codes.add("ALL");

  return codes;
}
