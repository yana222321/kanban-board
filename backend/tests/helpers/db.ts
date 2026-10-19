import { prisma } from '../../src/config/prisma';

const TABLES = [
  'activity_logs',
  'attachments',
  'comments',
  'cards',
  'labels',
  'columns',
  'boards',
  'project_members',
  'projects',
  'users',
];

export async function resetDatabase(): Promise<void> {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
