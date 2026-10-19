"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.tokenFor = tokenFor;
exports.authHeader = authHeader;
exports.createProjectFixture = createProjectFixture;
exports.createCardDirect = createCardDirect;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../src/config/prisma");
const password_1 = require("../../src/utils/password");
const jwt_1 = require("../../src/utils/jwt");
let counter = 0;
async function createUser(options = {}) {
    counter += 1;
    const email = options.email ?? `user${counter}-${Date.now()}@test.local`;
    return prisma_1.prisma.user.create({
        data: {
            email,
            name: options.name ?? `Test User ${counter}`,
            passwordHash: await (0, password_1.hashPassword)(options.password ?? 'Password123!'),
            role: options.role ?? client_1.Role.DEVELOPER,
        },
    });
}
function tokenFor(user) {
    return (0, jwt_1.signAccessToken)({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    });
}
function authHeader(user) {
    return { Authorization: `Bearer ${tokenFor(user)}` };
}
async function createProjectFixture(owner, options = {}) {
    const project = await prisma_1.prisma.project.create({
        data: {
            name: 'Test Project',
            key: `T${Date.now().toString().slice(-6)}`,
            ownerId: owner.id,
            members: {
                create: [
                    { userId: owner.id, role: client_1.MemberRole.MANAGER },
                    ...(options.memberIds ?? []).map((userId) => ({ userId, role: client_1.MemberRole.DEVELOPER })),
                ],
            },
            boards: {
                create: {
                    name: 'Main Board',
                    columns: {
                        create: [
                            { name: 'To Do', position: 0 },
                            { name: 'In Progress', position: 1, wipLimit: options.wipLimit ?? null },
                            { name: 'Done', position: 2 },
                        ],
                    },
                },
            },
        },
        include: { boards: { include: { columns: { orderBy: { position: 'asc' } } } } },
    });
    const board = project.boards[0];
    const columns = board.columns;
    return {
        projectId: project.id,
        boardId: board.id,
        todoColumnId: columns[0].id,
        inProgressColumnId: columns[1].id,
        doneColumnId: columns[2].id,
    };
}
async function createCardDirect(columnId, authorId, overrides = {}) {
    return prisma_1.prisma.card.create({
        data: {
            title: overrides.title ?? 'Card',
            columnId,
            createdById: authorId,
            priority: overrides.priority ?? client_1.Priority.MEDIUM,
            position: overrides.position ?? 0,
        },
    });
}
//# sourceMappingURL=factories.js.map