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
  const roleValue = `${user?.jobRole || user?.position || user?.role || ""}`;
  const explicitPosition = findTrainingPosition(positions, roleValue.toUpperCase());

  if (explicitPosition?.parentCode) {
    return new Set([explicitPosition.code, explicitPosition.parentCode, "ALL"]);
  }

  if (explicitPosition?.code) {
    const childCodes = (explicitPosition.children || []).map((child) => child.code);
    return new Set([explicitPosition.code, ...childCodes, "ALL"]);
  }

  const role = roleValue.toLowerCase();
  let parentCode = "FOH";

  if (role.includes("kitchen") || role.includes("boh") || role.includes("chef")) {
    parentCode = "BOH";
  } else if (role.includes("cash")) {
    parentCode = "CASH";
  } else if (role.includes("regional") || role.includes("rm")) {
    parentCode = "RM";
  } else if (role.includes("manager") || role.includes("store") || role.includes("sm")) {
    parentCode = "SM";
  }

  const position = findTrainingPosition(positions, parentCode);
  const childCodes = (position?.children || []).map((child) => child.code);

  return new Set([parentCode, ...childCodes, "ALL"]);
}
