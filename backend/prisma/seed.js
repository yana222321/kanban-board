"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const password = (plain) => bcryptjs_1.default.hash(plain, 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@kanban.local' },
        update: {},
        create: {
            email: 'admin@kanban.local',
            name: 'Alice Admin',
            passwordHash: await password('Admin123!'),
            role: client_1.Role.ADMIN,
        },
    });
    const manager = await prisma.user.upsert({
        where: { email: 'manager@kanban.local' },
        update: {},
        create: {
            email: 'manager@kanban.local',
            name: 'Yana',
            passwordHash: await password('Manager123!'),
            role: client_1.Role.MANAGER,
        },
    });
    const dev = await prisma.user.upsert({
        where: { email: 'dev@kanban.local' },
        update: {},
        create: {
            email: 'dev@kanban.local',
            name: 'Dana Developer',
            passwordHash: await password('Dev12345!'),
            role: client_1.Role.DEVELOPER,
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
                    { userId: manager.id, role: client_1.MemberRole.MANAGER },
                    { userId: dev.id, role: client_1.MemberRole.DEVELOPER },
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
    const todo = board.columns.find((c) => c.name === 'To Do');
    const inProgress = board.columns.find((c) => c.name === 'In Progress');
    await prisma.card.create({
        data: {
            title: 'Set up project repository',
            description: 'Initialize the repository and CI pipeline',
            priority: client_1.Priority.HIGH,
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
            priority: client_1.Priority.MEDIUM,
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
//# sourceMappingURL=seed.js.map