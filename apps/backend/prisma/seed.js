const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const HOLDING_RESTAURANT = {
  name: 'ZHAO Groupe',
  address: '169 avenue de Choisy 75013',
  photoUrl: null,
};
const LOCAL_SUPER_ADMIN_EMAIL = 'admin@zhao-family.local';

const PERMISSIONS = [
  {
    key: 'system.permission.manage',
    description: 'Manage system role assignments',
  },
  {
    key: 'employee.job_role.manage_store',
    description: 'Manage job roles for employees in the same store',
  },
  {
    key: 'training.material.read',
    description: 'Read training material metadata',
  },
  {
    key: 'training.material.play',
    description: 'Open and play training materials',
  },
  {
    key: 'training.material.create',
    description: 'Create training materials',
  },
  {
    key: 'training.material.update',
    description: 'Update training materials',
  },
  {
    key: 'training.material.delete',
    description: 'Delete training materials',
  },
  {
    key: 'training.position.manage',
    description: 'Manage training positions',
  },
  {
    key: 'training.progress.view_store',
    description: 'View store training progress',
  },
  {
    key: 'recruitment.request.manage',
    description: 'Manage recruitment requests from stores',
  },
  {
    key: 'abc.score.read',
    description: 'View ABC score cycles and leaderboard',
  },
  {
    key: 'abc.score.fill_marketing',
    description: 'Fill ABC marketing scores for stores',
  },
  {
    key: 'abc.score.fill_operations',
    description: 'Fill ABC operations (audit) scores and upload reports',
  },
  {
    key: 'abc.score.publish',
    description: 'Publish the ABC score leaderboard',
  },
  {
    key: 'case.share.review',
    description: 'Review (approve/reject) shared cases from partners',
  },
];

const TRAINING_POSITIONS = [
  {
    code: 'ALL',
    nameZh: '全岗通用',
    nameEn: 'All positions',
    nameFr: 'Tous les postes',
    parentCode: null,
    sortOrder: 0,
  },
  {
    code: 'FOH',
    nameZh: '前厅',
    nameEn: 'Front of House',
    nameFr: 'Salle',
    parentCode: null,
    sortOrder: 10,
  },
  {
    code: 'FRONT_HOST',
    nameZh: '迎宾',
    nameEn: 'Host',
    nameFr: 'Accueil',
    parentCode: 'FOH',
    sortOrder: 11,
  },
  {
    code: 'FRONT_CASHIER',
    nameZh: '收银',
    nameEn: 'Cashier',
    nameFr: 'Caisse',
    parentCode: 'FOH',
    sortOrder: 12,
  },
  {
    code: 'FRONT_SERVER',
    nameZh: '服务生',
    nameEn: 'Server',
    nameFr: 'Serveur',
    parentCode: 'FOH',
    sortOrder: 13,
  },
  {
    code: 'FRONT_PACKER',
    nameZh: '打包',
    nameEn: 'Packing',
    nameFr: 'Emballage',
    parentCode: 'FOH',
    sortOrder: 14,
  },
  {
    code: 'FRONT_BAR',
    nameZh: '吧台',
    nameEn: 'Bar',
    nameFr: 'Bar',
    parentCode: 'FOH',
    sortOrder: 15,
  },
  {
    code: 'BOH',
    nameZh: '后厨',
    nameEn: 'Back of House',
    nameFr: 'Cuisine',
    parentCode: null,
    sortOrder: 20,
  },
  {
    code: 'BACK_DISHWASHER',
    nameZh: '洗碗',
    nameEn: 'Dishwasher',
    nameFr: 'Plonge',
    parentCode: 'BOH',
    sortOrder: 21,
  },
  {
    code: 'BACK_NOODLE',
    nameZh: '打面',
    nameEn: 'Noodle station',
    nameFr: 'Nouilles',
    parentCode: 'BOH',
    sortOrder: 22,
  },
  {
    code: 'BACK_HOT_APPETIZER',
    nameZh: '热前菜',
    nameEn: 'Hot appetizers',
    nameFr: 'Entrées chaudes',
    parentCode: 'BOH',
    sortOrder: 23,
  },
  {
    code: 'BACK_COLD_APPETIZER',
    nameZh: '冷前菜',
    nameEn: 'Cold appetizers',
    nameFr: 'Entrées froides',
    parentCode: 'BOH',
    sortOrder: 24,
  },
  {
    code: 'BACK_RICE',
    nameZh: '饭',
    nameEn: 'Rice station',
    nameFr: 'Riz',
    parentCode: 'BOH',
    sortOrder: 25,
  },
  {
    code: 'CASH',
    nameZh: '收银',
    nameEn: 'Cashier',
    nameFr: 'Caisse',
    parentCode: null,
    sortOrder: 30,
  },
  {
    code: 'SM',
    nameZh: '店长',
    nameEn: 'Store Manager',
    nameFr: 'Responsable boutique',
    parentCode: null,
    sortOrder: 40,
  },
  {
    code: 'RM',
    nameZh: '区域经理',
    nameEn: 'Regional Manager',
    nameFr: 'Responsable régional',
    parentCode: null,
    sortOrder: 50,
  },
  {
    code: 'HOLDING',
    nameZh: '总部',
    nameEn: 'Holding',
    nameFr: 'Holding',
    parentCode: null,
    sortOrder: 60,
  },
];

const TRAINING_JOB_ROLE_POSITIONS = [
  {
    jobRole: 'holding',
    positionCode: 'HOLDING',
    includeDescendants: false,
    grantsAllPositions: true,
  },
  {
    jobRole: 'regional-manager',
    positionCode: 'RM',
    includeDescendants: false,
    grantsAllPositions: true,
  },
  {
    jobRole: 'store-manager',
    positionCode: 'SM',
    includeDescendants: false,
    grantsAllPositions: true,
  },
  {
    jobRole: 'front-manager',
    positionCode: 'FOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-manager',
    positionCode: 'BOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-assistant',
    positionCode: 'FOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-assistant',
    positionCode: 'BOH',
    includeDescendants: true,
    grantsAllPositions: false,
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
  {
    jobRole: 'front-host',
    positionCode: 'FRONT_HOST',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-cashier',
    positionCode: 'FRONT_CASHIER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-server',
    positionCode: 'FRONT_SERVER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-packer',
    positionCode: 'FRONT_PACKER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-bar',
    positionCode: 'FRONT_BAR',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-dishwasher',
    positionCode: 'BACK_DISHWASHER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-noodle',
    positionCode: 'BACK_NOODLE',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-hot-appetizer',
    positionCode: 'BACK_HOT_APPETIZER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-cold-appetizer',
    positionCode: 'BACK_COLD_APPETIZER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-rice',
    positionCode: 'BACK_RICE',
    includeDescendants: false,
    grantsAllPositions: false,
  },
];

const ROLES = [
  {
    name: 'super-admin',
    description: 'Full first-version system administration access',
    permissions: PERMISSIONS.map((permission) => permission.key),
  },
  {
    name: 'store-manager',
    description: 'Store manager baseline access',
    permissions: [
      'employee.job_role.manage_store',
      'training.material.read',
      'training.material.play',
      'training.progress.view_store',
      'recruitment.request.manage',
    ],
  },
  {
    name: 'training-admin',
    description: 'Can manage training materials',
    permissions: [
      'training.material.read',
      'training.material.play',
      'training.material.create',
      'training.material.update',
      'training.material.delete',
      'training.position.manage',
      'training.progress.view_store',
    ],
  },
  {
    name: 'training-viewer',
    description: 'Can view and play training materials',
    permissions: ['training.material.read', 'training.material.play'],
  },
  {
    name: 'marketing-admin',
    description: 'Marketing department: fills ABC marketing scores',
    permissions: ['abc.score.read', 'abc.score.fill_marketing'],
  },
  {
    name: 'operations-admin',
    description:
      'Operations department: fills ABC audit scores and uploads reports',
    permissions: ['abc.score.read', 'abc.score.fill_operations'],
  },
];

async function upsertPermissions() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }
}

async function upsertRoles() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description,
      },
    });
  }
}

async function replaceRolePermissions() {
  for (const roleConfig of ROLES) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleConfig.name },
      select: { id: true },
    });
    const permissions = await prisma.permission.findMany({
      where: {
        key: {
          in: roleConfig.permissions,
        },
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      if (permissions.length === 0) {
        return;
      }

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    });
  }
}

async function upsertTrainingPositions() {
  for (const position of TRAINING_POSITIONS) {
    await prisma.trainingPosition.upsert({
      where: { code: position.code },
      update: {
        nameZh: position.nameZh,
        nameEn: position.nameEn,
        nameFr: position.nameFr,
        parentCode: position.parentCode,
        isActive: true,
        sortOrder: position.sortOrder,
      },
      create: {
        ...position,
        isActive: true,
      },
    });
  }
}

async function upsertJobRolePositions() {
  for (const mapping of TRAINING_JOB_ROLE_POSITIONS) {
    await prisma.trainingJobRolePosition.upsert({
      where: { jobRole: mapping.jobRole },
      update: {
        positionCode: mapping.positionCode,
        includeDescendants: mapping.includeDescendants,
        grantsAllPositions: mapping.grantsAllPositions,
      },
      create: mapping,
    });
  }
}

const TRAINING_TITLES = [
  {
    code: 'TITLE_ALL_ONBOARDED',
    nameZh: 'ZHAO 入门',
    nameEn: 'ZHAO Onboarded',
    nameFr: 'ZHAO Initié',
    frameStyle: 'red',
    unlockPositionCode: 'ALL',
    sortOrder: 1,
  },
  {
    code: 'TITLE_FOH_CERTIFIED',
    nameZh: '前厅认证',
    nameEn: 'Front Certified',
    nameFr: 'Salle Certifié',
    frameStyle: 'gold',
    unlockPositionCode: 'FOH',
    sortOrder: 2,
  },
  {
    code: 'TITLE_BOH_CERTIFIED',
    nameZh: '后厨认证',
    nameEn: 'Kitchen Certified',
    nameFr: 'Cuisine Certifié',
    frameStyle: 'jade',
    unlockPositionCode: 'BOH',
    sortOrder: 3,
  },
];

const SAMPLE_QUIZ_QUESTIONS = [
  {
    type: 'single',
    prompt: '处理生熟食材时，正确的做法是？',
    options: [
      { key: 'a', label: '使用同一块砧板节省时间' },
      { key: 'b', label: '生熟分开，使用不同砧板和刀具' },
      { key: 'c', label: '只要看起来干净即可' },
    ],
    correctKeys: ['b'],
    explanation: '生熟分开可避免交叉污染，是食品安全的基本要求。',
    sortOrder: 1,
  },
  {
    type: 'multiple',
    prompt: '以下哪些属于洗手的关键时刻？（多选）',
    options: [
      { key: 'a', label: '接触生肉后' },
      { key: 'b', label: '上洗手间后' },
      { key: 'c', label: '处理即食食品前' },
      { key: 'd', label: '下班离店时' },
    ],
    correctKeys: ['a', 'b', 'c'],
    explanation: '接触污染源后和接触即食食品前都必须洗手。',
    sortOrder: 2,
  },
  {
    type: 'boolean',
    prompt: '冷藏区温度应保持在 4°C 或以下。',
    options: [
      { key: 'true', label: '正确' },
      { key: 'false', label: '错误' },
    ],
    correctKeys: ['true'],
    explanation: '冷藏温度应保持在 4°C 或以下以抑制细菌繁殖。',
    sortOrder: 3,
  },
];

async function upsertTrainingTitles() {
  for (const title of TRAINING_TITLES) {
    await prisma.trainingTitle.upsert({
      where: { code: title.code },
      update: {
        nameZh: title.nameZh,
        nameEn: title.nameEn,
        nameFr: title.nameFr,
        frameStyle: title.frameStyle,
        unlockPositionCode: title.unlockPositionCode,
        sortOrder: title.sortOrder,
      },
      create: title,
    });
  }
}

// Attaches a demo quiz to the first required "ALL" material that has none, so
// the mobile quiz flow can be exercised once at least one material exists.
async function seedSampleQuiz() {
  const material = await prisma.trainingMaterial.findFirst({
    where: { positionId: 'ALL', isRequired: true, quiz: { is: null } },
    orderBy: { id: 'asc' },
    select: { id: true, title: true },
  });

  if (!material) {
    console.log(
      '[seed] no eligible ALL material without a quiz; sample quiz skipped',
    );
    return;
  }

  const quiz = await prisma.trainingQuiz.create({
    data: {
      materialId: material.id,
      passingScore: 80,
      maxAttempts: null,
      questions: { create: SAMPLE_QUIZ_QUESTIONS },
    },
  });

  console.log(
    `[seed] attached sample quiz ${quiz.id} to material ${material.id} ("${material.title}")`,
  );
}

async function upsertHoldingRestaurant() {
  const existing = await prisma.restaurant.findUnique({
    where: { name: HOLDING_RESTAURANT.name },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  // Only bootstrap the synthetic holding store on a fresh/empty database.
  // On an already-populated DB the real HQ restaurant already exists, so
  // creating "ZHAO Holding" here would just add an orphan row.
  const restaurantCount = await prisma.restaurant.count();

  if (restaurantCount > 0) {
    return null;
  }

  return prisma.restaurant.create({
    data: {
      ...HOLDING_RESTAURANT,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
}

async function assignSuperAdminRole() {
  const superAdminEmail = (
    process.env.SUPER_ADMIN_EMAIL || LOCAL_SUPER_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase();

  if (!superAdminEmail) {
    return;
  }

  const [user, role, holdingRestaurant] = await Promise.all([
    prisma.user.findUnique({
      where: { email: superAdminEmail },
      select: { id: true },
    }),
    prisma.role.findUnique({
      where: { name: 'super-admin' },
      select: { id: true },
    }),
    upsertHoldingRestaurant(),
  ]);

  if (!user || !role) {
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        ...(holdingRestaurant ? { restaurantId: holdingRestaurant.id } : {}),
        jobRole: 'holding',
      },
    }),
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    }),
  ]);
}

async function removeSuperAdminRoleFromStoreUsers() {
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super-admin' },
    select: { id: true },
  });

  if (!superAdminRole) {
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      jobRole: {
        not: 'holding',
      },
      userRoles: {
        some: {
          roleId: superAdminRole.id,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (users.length === 0) {
    return;
  }

  await prisma.userRole.deleteMany({
    where: {
      roleId: superAdminRole.id,
      userId: {
        in: users.map((user) => user.id),
      },
    },
  });
}

async function removeStoreManagerRoleFromNonManagers() {
  const storeManagerRole = await prisma.role.findUnique({
    where: { name: 'store-manager' },
    select: { id: true },
  });

  if (!storeManagerRole) {
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        {
          jobRole: {
            not: {
              contains: 'store-manager',
            },
          },
        },
        {
          jobRole: {
            not: {
              contains: 'regional-manager',
            },
          },
        },
      ],
      userRoles: {
        some: {
          roleId: storeManagerRole.id,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (users.length === 0) {
    return;
  }

  await prisma.userRole.deleteMany({
    where: {
      roleId: storeManagerRole.id,
      userId: {
        in: users.map((user) => user.id),
      },
    },
  });
}

async function main() {
  await upsertHoldingRestaurant();
  await upsertPermissions();
  await upsertRoles();
  await replaceRolePermissions();
  await upsertTrainingPositions();
  await upsertJobRolePositions();
  await upsertTrainingTitles();
  await seedSampleQuiz();
  await assignSuperAdminRole();
  await removeSuperAdminRoleFromStoreUsers();
  await removeStoreManagerRoleFromNonManagers();
}

main().finally(async () => {
  await prisma.$disconnect();
});
