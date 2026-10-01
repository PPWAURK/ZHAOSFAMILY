import { PrismaClient } from '@prisma/client';
import { deleteUserAccountRecords } from '../auth/user-account-deletion';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for inactive account cleanup');
  }

  const execute = process.argv.includes('--execute');
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({
      where: { accountStatus: { in: ['removed', 'deleted'] } },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    process.stdout.write(`Inactive accounts found: ${users.length}\n`);
    if (!execute) {
      process.stdout.write(
        'Dry run only. Pass --execute after deploying the migration and application.\n',
      );
      return;
    }

    for (const user of users) {
      await deleteUserAccountRecords(prisma, user.id);
    }

    const remaining = await prisma.user.count({
      where: { accountStatus: { in: ['removed', 'deleted'] } },
    });
    process.stdout.write(
      `Deleted: ${users.length - remaining}; remaining: ${remaining}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `Inactive account cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
