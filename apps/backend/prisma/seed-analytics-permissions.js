const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ANALYTICS_PERMISSIONS = [
  {
    key: 'system.analytics.view',
    description: 'View aggregated platform usage analytics',
  },
  {
    key: 'system.analytics.export',
    description: 'Export aggregated platform usage reports',
  },
];

async function ensureAnalyticsPermissions() {
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super-admin' },
    select: { id: true },
  });

  if (!superAdminRole) {
    throw new Error('SUPER_ADMIN_ROLE_REQUIRED');
  }

  for (const permissionConfig of ANALYTICS_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { key: permissionConfig.key },
      update: { description: permissionConfig.description },
      create: permissionConfig,
      select: { id: true },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }
}

ensureAnalyticsPermissions()
  .then(() => console.log('[analytics-permissions] ready'))
  .catch((error) => {
    console.error('[analytics-permissions] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
