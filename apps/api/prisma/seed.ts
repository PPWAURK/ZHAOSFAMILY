import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@zhao.local';
  const plainPassword = 'AdminPass123!';
  const name = '管理员';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Admin déjà présent : ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: Role.ADMIN,
    },
  });

  console.log('─────────────────────────────────────────');
  console.log('  Admin créé :');
  console.log(`    email    : ${email}`);
  console.log(`    password : ${plainPassword}`);
  console.log('  ⚠️  À changer après le premier login.');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
