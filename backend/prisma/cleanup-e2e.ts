/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const projects = await prisma.project.deleteMany({
    where: { key: { startsWith: 'E2E' } },
  });

  const users = await prisma.user.deleteMany({
    where: { email: { startsWith: 'e2e-', endsWith: '@test.local' } },
  });

  console.log(
    `E2E cleanup: removed ${projects.count} project(s) and ${users.count} user(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
