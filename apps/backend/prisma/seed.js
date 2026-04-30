const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PERMISSIONS = [
  {
    key: 'system.permission.manage',
    description: 'Manage system role assignments',
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
    code: 'BOH',
    nameZh: '后厨',
    nameEn: 'Back of House',
    nameFr: 'Cuisine',
    parentCode: null,
    sortOrder: 20,
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
    permissions: ['training.material.read', 'training.material.play'],
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
    ],
  },
  {
    name: 'training-viewer',
    description: 'Can view and play training materials',
    permissions: ['training.material.read', 'training.material.play'],
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

async function assignSuperAdminRole() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  if (!superAdminEmail) {
    return;
  }

  const [user, role] = await Promise.all([
    prisma.user.findUnique({
      where: { email: superAdminEmail },
      select: { id: true },
    }),
    prisma.role.findUnique({
      where: { name: 'super-admin' },
      select: { id: true },
    }),
  ]);

  if (!user || !role) {
    return;
  }

  await prisma.userRole.upsert({
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
  });
}

async function main() {
  await upsertPermissions();
  await upsertRoles();
  await replaceRolePermissions();
  await upsertTrainingPositions();
  await assignSuperAdminRole();
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
