import {
  resolveTrainingPositionCodes,
  resolveTrainingMaterialRecipients,
  type TrainingJobRolePositionRow,
  type TrainingMaterialRecipient,
  type TrainingPositionResolverPositionRow,
} from './training-position-resolver';

describe('resolveTrainingPositionCodes', () => {
  it('includes every descendant when a hierarchical position is assigned directly', () => {
    const result = resolveTrainingPositionCodes(
      'FRONT_MANAGER',
      [
        { code: 'ALL', parentCode: null },
        { code: 'FRONT_OF_HOUSE', parentCode: null },
        { code: 'FRONT_MANAGER', parentCode: 'FRONT_OF_HOUSE' },
        { code: 'FRONT_ASSISTANT', parentCode: 'FRONT_MANAGER' },
        { code: 'FRONT_HOST', parentCode: 'FRONT_ASSISTANT' },
      ],
      [],
    );

    expect(result).toEqual({
      positionCodes: [
        'FRONT_MANAGER',
        'FRONT_ASSISTANT',
        'FRONT_HOST',
        'FRONT_OF_HOUSE',
        'ALL',
      ],
      warnings: [],
    });
  });

  it('uses an explicit mapping for a training-position job role', () => {
    const result = resolveTrainingPositionCodes(
      'STORE_MANAGER_PARTNER',
      [
        { code: 'ALL', parentCode: null },
        { code: 'STORE_MANAGER_PARTNER', parentCode: null },
        { code: 'FRONT_HOST', parentCode: 'FRONT_OF_HOUSE' },
      ],
      [
        {
          jobRole: 'STORE_MANAGER_PARTNER',
          positionCode: 'STORE_MANAGER_PARTNER',
          includeDescendants: false,
          grantsAllPositions: true,
        },
      ],
    );

    expect(result).toEqual({
      positionCodes: ['ALL', 'STORE_MANAGER_PARTNER', 'FRONT_HOST'],
      warnings: [],
    });
  });

  it('excludes store manager partner materials from the store manager all-position scope', () => {
    const result = resolveTrainingPositionCodes(
      'store-manager',
      [
        { code: 'ALL', parentCode: null },
        { code: 'SM', parentCode: null },
        { code: 'STORE_MANAGER_PARTNER', parentCode: null },
        { code: 'FRONT_HOST', parentCode: 'FRONT_OF_HOUSE' },
      ],
      [
        {
          jobRole: 'store-manager',
          positionCode: 'SM',
          includeDescendants: false,
          grantsAllPositions: true,
        },
      ],
    );

    expect(result).toEqual({
      positionCodes: ['ALL', 'SM', 'FRONT_HOST'],
      warnings: [],
    });
  });

  it('includes store manager partner materials when that position is explicitly assigned', () => {
    const result = resolveTrainingPositionCodes(
      'store-manager,STORE_MANAGER_PARTNER',
      [
        { code: 'ALL', parentCode: null },
        { code: 'SM', parentCode: null },
        { code: 'STORE_MANAGER_PARTNER', parentCode: null },
        { code: 'FRONT_HOST', parentCode: 'FRONT_OF_HOUSE' },
      ],
      [
        {
          jobRole: 'store-manager',
          positionCode: 'SM',
          includeDescendants: false,
          grantsAllPositions: true,
        },
        {
          jobRole: 'STORE_MANAGER_PARTNER',
          positionCode: 'STORE_MANAGER_PARTNER',
          includeDescendants: false,
          grantsAllPositions: false,
        },
      ],
    );

    expect(result.positionCodes).toContain('STORE_MANAGER_PARTNER');
  });
});

describe('resolveTrainingMaterialRecipients', () => {
  const positions: TrainingPositionResolverPositionRow[] = [
    { code: 'HOLDING', parentCode: null },
    { code: 'FOH', parentCode: null },
    { code: 'BOH', parentCode: null },
    { code: 'FOH_WAITER', parentCode: 'FOH' },
    { code: 'BOH_COOK', parentCode: 'BOH' },
  ];

  const mappings: TrainingJobRolePositionRow[] = [
    {
      jobRole: 'holding',
      positionCode: 'HOLDING',
      includeDescendants: false,
      grantsAllPositions: true,
    },
    {
      jobRole: 'front-of-house',
      positionCode: 'FOH',
      includeDescendants: true,
      grantsAllPositions: false,
    },
    {
      jobRole: 'back-of-house',
      positionCode: 'BOH',
      includeDescendants: true,
      grantsAllPositions: false,
    },
  ];

  const holding: TrainingMaterialRecipient = {
    id: 1,
    jobRole: 'holding',
    preferredLanguage: 'fr',
  };
  const waiter: TrainingMaterialRecipient = {
    id: 2,
    jobRole: 'front-of-house',
    preferredLanguage: 'zh',
  };
  const cook: TrainingMaterialRecipient = {
    id: 3,
    jobRole: 'back-of-house',
    preferredLanguage: 'en',
  };
  const stranger: TrainingMaterialRecipient = {
    id: 4,
    jobRole: 'unknown-role',
    preferredLanguage: null,
  };
  const users = [holding, waiter, cook, stranger];

  function recipientIds(positionCode: string): number[] {
    return resolveTrainingMaterialRecipients(
      positionCode,
      positions,
      mappings,
      users,
    )
      .map((user) => user.id)
      .sort();
  }

  it('includes descendant positions for the matching role and grants-all roles', () => {
    // FOH_WAITER is a descendant of FOH → front-of-house; holding sees everything.
    expect(recipientIds('FOH_WAITER')).toEqual([1, 2]);
  });

  it('targets only the matching branch for an anchor position', () => {
    expect(recipientIds('BOH')).toEqual([1, 3]);
  });

  it('sends ALL-position materials to every user', () => {
    expect(recipientIds('ALL')).toEqual([1, 2, 3, 4]);
  });

  it('excludes users whose scope does not cover the position', () => {
    // The stranger's unknown role resolves to ALL only, so a specific position
    // never reaches them.
    expect(recipientIds('FOH')).not.toContain(4);
  });
});
