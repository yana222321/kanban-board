"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("@prisma/client");
const app_1 = require("../../src/app");
const db_1 = require("../helpers/db");
const factories_1 = require("../helpers/factories");
const app = (0, app_1.createApp)();
describe('Boards & Columns API', () => {
    beforeAll(async () => {
        await (0, db_1.resetDatabase)();
    });
    afterAll(async () => {
        await (0, db_1.disconnectDatabase)();
    });
    it('creates a board with default columns', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app)
            .post(`/api/projects/${fx.projectId}/boards`)
            .set((0, factories_1.authHeader)(owner))
            .send({ name: 'Sprint Board' });
        expect(res.status).toBe(201);
        expect(res.body.board.columns).toHaveLength(3);
    });
    it('forbids a non-member from creating a board', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const outsider = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app)
            .post(`/api/projects/${fx.projectId}/boards`)
            .set((0, factories_1.authHeader)(outsider))
            .send({ name: 'Sneaky' });
        expect(res.status).toBe(403);
    });
    it('returns a board with columns and cards', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app).get(`/api/boards/${fx.boardId}`).set((0, factories_1.authHeader)(owner));
        expect(res.status).toBe(200);
        expect(res.body.board.columns.length).toBe(3);
        expect(Array.isArray(res.body.board.columns[0].cards)).toBe(true);
    });
    it('creates, renames and updates the WIP limit of a column', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const created = await (0, supertest_1.default)(app)
            .post(`/api/boards/${fx.boardId}/columns`)
            .set((0, factories_1.authHeader)(owner))
            .send({ name: 'Review', wipLimit: 2 });
        expect(created.status).toBe(201);
        const columnId = created.body.column.id;
        const updated = await (0, supertest_1.default)(app)
            .patch(`/api/columns/${columnId}`)
            .set((0, factories_1.authHeader)(owner))
            .send({ name: 'Code Review', wipLimit: 5 });
        expect(updated.status).toBe(200);
        expect(updated.body.column.name).toBe('Code Review');
        expect(updated.body.column.wipLimit).toBe(5);
    });
    it('reorders columns', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app)
            .patch(`/api/boards/${fx.boardId}/columns/reorder`)
            .set((0, factories_1.authHeader)(owner))
            .send({ columnIds: [fx.doneColumnId, fx.todoColumnId, fx.inProgressColumnId] });
        expect(res.status).toBe(200);
        expect(res.body.columns[0].id).toBe(fx.doneColumnId);
    });
    it('rejects a reorder payload that does not contain all columns', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app)
            .patch(`/api/boards/${fx.boardId}/columns/reorder`)
            .set((0, factories_1.authHeader)(owner))
            .send({ columnIds: [fx.todoColumnId] });
        expect(res.status).toBe(400);
    });
    it('deletes a column', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app).delete(`/api/columns/${fx.doneColumnId}`).set((0, factories_1.authHeader)(owner));
        expect(res.status).toBe(200);
        const board = await (0, supertest_1.default)(app).get(`/api/boards/${fx.boardId}`).set((0, factories_1.authHeader)(owner));
        expect(board.body.board.columns).toHaveLength(2);
    });
});
//# sourceMappingURL=boards.test.js.map