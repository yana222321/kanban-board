"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetDatabase = resetDatabase;
exports.disconnectDatabase = disconnectDatabase;
const prisma_1 = require("../../src/config/prisma");
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
async function resetDatabase() {
    const list = TABLES.map((t) => `"${t}"`).join(', ');
    await prisma_1.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}
async function disconnectDatabase() {
    await prisma_1.prisma.$disconnect();
}
//# sourceMappingURL=db.js.map