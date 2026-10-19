/* eslint-disable no-console */
import { MemberRole, PrismaClient, Priority, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const password = (plain: string) => bcrypt.hash(plain, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@kanban.local' },
    update: {},
    create: {
      email: 'admin@kanban.local',
      name: 'Alice Admin',
      passwordHash: await password('Admin123!'),
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@kanban.local' },
    update: {},
    create: {
      email: 'manager@kanban.local',
      name: 'Yana',
      passwordHash: await password('Manager123!'),
      role: Role.MANAGER,
    },
  });

  const dev = await prisma.user.upsert({
    where: { email: 'dev@kanban.local' },
    update: {},
    create: {
      email: 'dev@kanban.local',
      name: 'Dana Developer',
      passwordHash: await password('Dev12345!'),
      role: Role.DEVELOPER,
    },
  });

  const existingProject = await prisma.project.findUnique({ where: { key: 'DEMO' } });
  if (existingProject) {
    console.log('Demo project already exists, skipping.');
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
      key: 'DEMO',
      description: 'Sample project created by the seed script',
      ownerId: manager.id,
      members: {
        create: [
          { userId: manager.id, role: MemberRole.MANAGER },
          { userId: dev.id, role: MemberRole.DEVELOPER },
        ],
      },
      labels: {
        create: [
          { name: 'bug', color: '#ef4444' },
          { name: 'feature', color: '#22c55e' },
        ],
      },
      boards: {
        create: {
          name: 'Main Board',
          columns: {
            create: [
              { name: 'To Do', position: 0 },
              { name: 'In Progress', position: 1, wipLimit: 3 },
              { name: 'Done', position: 2 },
            ],
          },
        },
      },
    },
    include: { boards: { include: { columns: true } }, labels: true },
  });

  const board = project.boards[0];
  const todo = board.columns.find((c) => c.name === 'To Do')!;
  const inProgress = board.columns.find((c) => c.name === 'In Progress')!;

  await prisma.card.create({
    data: {
      title: 'Set up project repository',
      description: 'Initialize the repository and CI pipeline',
      priority: Priority.HIGH,
      columnId: todo.id,
      position: 0,
      createdById: manager.id,
      assigneeId: dev.id,
      labels: { connect: project.labels.map((l) => ({ id: l.id })) },
    },
  });

  await prisma.card.create({
    data: {
      title: 'Design database schema',
      description: 'Model users, projects, boards and cards',
      priority: Priority.MEDIUM,
      columnId: inProgress.id,
      position: 0,
      createdById: manager.id,
      assigneeId: dev.id,
    },
  });

  console.log('Seed completed.');
  console.log('Users:');
  console.log(`  admin@kanban.local    / Admin123!    (id: ${admin.id})`);
  console.log(`  manager@kanban.local  / Manager123!  (id: ${manager.id})`);
  console.log(`  dev@kanban.local      / Dev12345!    (id: ${dev.id})`);
  console.log(`Demo project id: ${project.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
