export const ALL_POSITION_CODE = 'ALL';

export type TrainingPositionResolverPositionRow = {
  code: string;
  parentCode: string | null;
};

export type TrainingJobRolePositionRow = {
  jobRole: string;
  positionCode: string;
  includeDescendants: boolean;
  grantsAllPositions: boolean;
};

export type TrainingPositionResolveWarning = {
  jobRole: string;
  reason: 'JOB_ROLE_MAPPING_NOT_FOUND' | 'TRAINING_POSITION_NOT_FOUND';
};

export type TrainingPositionResolveResult = {
  positionCodes: string[];
  warnings: TrainingPositionResolveWarning[];
};

export function getRoleValues(jobRole: string | null): string[] {
  return `${jobRole || ''}`
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
}

export function resolveTrainingPositionCodes(
  jobRole: string | null,
  positions: TrainingPositionResolverPositionRow[],
  mappings: TrainingJobRolePositionRow[],
): TrainingPositionResolveResult {
  const roleValues = getRoleValues(jobRole);
  const mappingByRole = new Map(
    mappings.map((mapping) => [mapping.jobRole, mapping]),
  );
  const positionByCode = new Map(
    positions.map((position) => [position.code, position]),
  );
  const resultCodes = new Set<string>();
  const warnings: TrainingPositionResolveWarning[] = [];

  for (const roleValue of roleValues) {
    const normalizedRole = roleValue.toLowerCase();
    const mapping = mappingByRole.get(normalizedRole);

    if (!mapping) {
      warnings.push({
        jobRole: roleValue,
        reason: 'JOB_ROLE_MAPPING_NOT_FOUND',
      });
      continue;
    }

    if (mapping.grantsAllPositions) {
      addCodes(
        resultCodes,
        positions.map((position) => position.code),
      );
      continue;
    }

    const anchor = positionByCode.get(mapping.positionCode);
    if (!anchor) {
      warnings.push({
        jobRole: roleValue,
        reason: 'TRAINING_POSITION_NOT_FOUND',
      });
      continue;
    }

    addCodes(resultCodes, getPositionScopeCodes(anchor, positions, mapping));
  }

  resultCodes.add(ALL_POSITION_CODE);

  return {
    positionCodes: [...resultCodes],
    warnings,
  };
}

function getPositionScopeCodes(
  anchor: TrainingPositionResolverPositionRow,
  positions: TrainingPositionResolverPositionRow[],
  mapping: Pick<
    TrainingJobRolePositionRow,
    'positionCode' | 'includeDescendants'
  >,
): string[] {
  const codes = [anchor.code];

  if (mapping.includeDescendants) {
    codes.push(...getDescendantCodes(mapping.positionCode, positions));
  }

  codes.push(...getAncestorCodes(anchor, positions));

  return codes;
}

function getAncestorCodes(
  anchor: TrainingPositionResolverPositionRow,
  positions: TrainingPositionResolverPositionRow[],
): string[] {
  const positionByCode = new Map(
    positions.map((position) => [position.code, position]),
  );
  const codes: string[] = [];
  const visited = new Set<string>([anchor.code]);
  let parentCode = anchor.parentCode;

  while (parentCode && !visited.has(parentCode)) {
    const parent = positionByCode.get(parentCode);

    if (!parent) {
      break;
    }

    codes.push(parent.code);
    visited.add(parent.code);
    parentCode = parent.parentCode;
  }

  return codes;
}

function getDescendantCodes(
  parentCode: string,
  positions: TrainingPositionResolverPositionRow[],
): string[] {
  const codes: string[] = [];
  const queue = [parentCode];
  const visited = new Set<string>([parentCode]);

  while (queue.length > 0) {
    const currentParentCode = queue.shift();
    const children = positions.filter(
      (position) => position.parentCode === currentParentCode,
    );

    for (const child of children) {
      if (visited.has(child.code)) {
        continue;
      }

      codes.push(child.code);
      queue.push(child.code);
      visited.add(child.code);
    }
  }

  return codes;
}

function addCodes(target: Set<string>, codes: string[]): void {
  for (const code of codes) {
    target.add(code);
  }
}
