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
describe('Additional coverage', () => {
    beforeAll(async () => {
        await (0, db_1.resetDatabase)();
    });
    afterAll(async () => {
        await (0, db_1.disconnectDatabase)();
    });
    it('serves the health check', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
    it('returns 404 for unknown routes', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/does-not-exist');
        expect(res.status).toBe(404);
    });
    it('rejects a malformed bearer token', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');
        expect(res.status).toBe(401);
    });
    it('rejects a refresh token used as an access token', async () => {
        const user = await (0, factories_1.createUser)();
        const login = await (0, supertest_1.default)(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'Password123!' });
        const res = await (0, supertest_1.default)(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${login.body.refreshToken}`);
        expect(res.status).toBe(401);
    });
    it('rejects a missing Authorization scheme', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/auth/me').set('Authorization', 'Token abc');
        expect(res.status).toBe(401);
    });
    it('returns 404 for resolver lookups of unknown resources', async () => {
        const user = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const randomId = '00000000-0000-0000-0000-000000000000';
        expect((await (0, supertest_1.default)(app).get(`/api/boards/${randomId}`).set((0, factories_1.authHeader)(user))).status).toBe(404);
        expect((await (0, supertest_1.default)(app).get(`/api/cards/${randomId}`).set((0, factories_1.authHeader)(user))).status).toBe(404);
        expect((await (0, supertest_1.default)(app).get(`/api/cards/${randomId}/comments`).set((0, factories_1.authHeader)(user))).status).toBe(404);
        expect((await (0, supertest_1.default)(app).patch(`/api/columns/${randomId}`).set((0, factories_1.authHeader)(user)).send({ name: 'x' }))
            .status).toBe(404);
    });
    it('rejects an invalid refresh token', async () => {
        const res = await (0, supertest_1.default)(app).post('/api/auth/refresh').send({ refreshToken: 'garbage' });
        expect(res.status).toBe(401);
    });
    it('logs out with 204', async () => {
        const user = await (0, factories_1.createUser)();
        const res = await (0, supertest_1.default)(app).post('/api/auth/logout').set((0, factories_1.authHeader)(user));
        expect(res.status).toBe(204);
    });
    describe('projects', () => {
        it('updates a project as the owner', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/projects/${fx.projectId}`)
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'Renamed' });
            expect(res.status).toBe(200);
            expect(res.body.project.name).toBe('Renamed');
        });
        it('rejects an empty update payload', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const res = await (0, supertest_1.default)(app).patch(`/api/projects/${fx.projectId}`).set((0, factories_1.authHeader)(owner)).send({});
            expect(res.status).toBe(422);
        });
        it('forbids a developer from updating a project', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const dev = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const fx = await (0, factories_1.createProjectFixture)(owner, { memberIds: [dev.id] });
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/projects/${fx.projectId}`)
                .set((0, factories_1.authHeader)(dev))
                .send({ name: 'Nope' });
            expect(res.status).toBe(403);
        });
        it('lists, updates and removes members', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const dev = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const fx = await (0, factories_1.createProjectFixture)(owner, { memberIds: [dev.id] });
            const list = await (0, supertest_1.default)(app)
                .get(`/api/projects/${fx.projectId}/members`)
                .set((0, factories_1.authHeader)(owner));
            expect(list.status).toBe(200);
            const membership = list.body.members.find((m) => m.userId === dev.id);
            expect(membership).toBeDefined();
            const update = await (0, supertest_1.default)(app)
                .patch(`/api/projects/${fx.projectId}/members/${membership.id}`)
                .set((0, factories_1.authHeader)(owner))
                .send({ role: 'VIEWER' });
            expect(update.status).toBe(200);
            expect(update.body.member.role).toBe('VIEWER');
            const remove = await (0, supertest_1.default)(app)
                .delete(`/api/projects/${fx.projectId}/members/${membership.id}`)
                .set((0, factories_1.authHeader)(owner));
            expect(remove.status).toBe(200);
        });
        it('returns 404 when adding an unknown user', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const res = await (0, supertest_1.default)(app)
                .post(`/api/projects/${fx.projectId}/members`)
                .set((0, factories_1.authHeader)(owner))
                .send({ email: 'nobody@nowhere.local' });
            expect(res.status).toBe(404);
        });
    });
    describe('boards', () => {
        it('renames and deletes a board', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const update = await (0, supertest_1.default)(app)
                .patch(`/api/boards/${fx.boardId}`)
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'Renamed Board' });
            expect(update.status).toBe(200);
            const remove = await (0, supertest_1.default)(app).delete(`/api/boards/${fx.boardId}`).set((0, factories_1.authHeader)(owner));
            expect(remove.status).toBe(200);
        });
        it('lists boards of a project', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const res = await (0, supertest_1.default)(app)
                .post('/api/projects')
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'P', key: `K${Date.now().toString().slice(-6)}` });
            const projectId = res.body.project.id;
            const list = await (0, supertest_1.default)(app).get(`/api/projects/${projectId}/boards`).set((0, factories_1.authHeader)(owner));
            expect(list.status).toBe(200);
            expect(list.body.boards.length).toBe(1);
        });
    });
    describe('cards', () => {
        it('gets, updates and deletes a card', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const dev = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const fx = await (0, factories_1.createProjectFixture)(owner, { memberIds: [dev.id] });
            const card = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'Original' });
            const get = await (0, supertest_1.default)(app).get(`/api/cards/${card.id}`).set((0, factories_1.authHeader)(owner));
            expect(get.status).toBe(200);
            const update = await (0, supertest_1.default)(app)
                .patch(`/api/cards/${card.id}`)
                .set((0, factories_1.authHeader)(owner))
                .send({ title: 'Updated', priority: 'LOW', assigneeId: dev.id });
            expect(update.status).toBe(200);
            expect(update.body.card.title).toBe('Updated');
            expect(update.body.card.assigneeId).toBe(dev.id);
            const remove = await (0, supertest_1.default)(app).delete(`/api/cards/${card.id}`).set((0, factories_1.authHeader)(owner));
            expect(remove.status).toBe(200);
        });
        it('reorders cards within the same column', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const first = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'First', position: 0 });
            const second = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'Second', position: 1 });
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/cards/${second.id}/move`)
                .set((0, factories_1.authHeader)(owner))
                .send({ columnId: fx.todoColumnId, position: 0 });
            expect(res.status).toBe(200);
            const board = await (0, supertest_1.default)(app).get(`/api/boards/${fx.boardId}`).set((0, factories_1.authHeader)(owner));
            const todo = board.body.board.columns.find((c) => c.id === fx.todoColumnId);
            expect(todo.cards[0].id).toBe(second.id);
            expect(todo.cards[1].id).toBe(first.id);
        });
        it('rejects moving a card to another board', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const other = await (0, factories_1.createProjectFixture)(owner);
            const card = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id);
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/cards/${card.id}/move`)
                .set((0, factories_1.authHeader)(owner))
                .send({ columnId: other.todoColumnId, position: 0 });
            expect(res.status).toBe(400);
        });
        it('deletes an own comment and an attachment', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const card = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id);
            const comment = await (0, supertest_1.default)(app)
                .post(`/api/cards/${card.id}/comments`)
                .set((0, factories_1.authHeader)(owner))
                .send({ body: 'temp' });
            const delComment = await (0, supertest_1.default)(app)
                .delete(`/api/comments/${comment.body.comment.id}`)
                .set((0, factories_1.authHeader)(owner));
            expect(delComment.status).toBe(200);
            const upload = await (0, supertest_1.default)(app)
                .post(`/api/cards/${card.id}/attachments`)
                .set((0, factories_1.authHeader)(owner))
                .attach('file', Buffer.from('data'), 'file.txt');
            const delAttachment = await (0, supertest_1.default)(app)
                .delete(`/api/attachments/${upload.body.attachment.id}`)
                .set((0, factories_1.authHeader)(owner));
            expect(delAttachment.status).toBe(200);
        });
        it('updates and deletes labels', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const created = await (0, supertest_1.default)(app)
                .post(`/api/projects/${fx.projectId}/labels`)
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'temp', color: '#123456' });
            const list = await (0, supertest_1.default)(app).get(`/api/projects/${fx.projectId}/labels`).set((0, factories_1.authHeader)(owner));
            expect(list.status).toBe(200);
            const update = await (0, supertest_1.default)(app)
                .patch(`/api/projects/${fx.projectId}/labels/${created.body.label.id}`)
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'renamed' });
            expect(update.status).toBe(200);
            const remove = await (0, supertest_1.default)(app)
                .delete(`/api/projects/${fx.projectId}/labels/${created.body.label.id}`)
                .set((0, factories_1.authHeader)(owner));
            expect(remove.status).toBe(200);
        });
        it('returns 409 when a label name already exists', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            await (0, supertest_1.default)(app)
                .post(`/api/projects/${fx.projectId}/labels`)
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'duplicate', color: '#111111' })
                .expect(201);
            const res = await (0, supertest_1.default)(app)
                .post(`/api/projects/${fx.projectId}/labels`)
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'duplicate', color: '#222222' });
            expect(res.status).toBe(409);
        });
        it('rejects a label that does not belong to the project', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const other = await (0, factories_1.createProjectFixture)(owner);
            const otherLabel = await (0, supertest_1.default)(app)
                .post(`/api/projects/${other.projectId}/labels`)
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'foreign', color: '#333333' });
            const res = await (0, supertest_1.default)(app)
                .post(`/api/columns/${fx.todoColumnId}/cards`)
                .set((0, factories_1.authHeader)(owner))
                .send({ title: 'x', labelIds: [otherLabel.body.label.id] });
            expect(res.status).toBe(400);
        });
        it('rejects an assignee that is not a member on update', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const stranger = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const card = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id);
            const res = await (0, supertest_1.default)(app)
                .patch(`/api/cards/${card.id}`)
                .set((0, factories_1.authHeader)(owner))
                .send({ assigneeId: stranger.id });
            expect(res.status).toBe(400);
        });
        it('forbids a viewer from creating a card', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const viewer = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            await (0, supertest_1.default)(app)
                .post(`/api/projects/${fx.projectId}/members`)
                .set((0, factories_1.authHeader)(owner))
                .send({ email: viewer.email, role: 'VIEWER' });
            const res = await (0, supertest_1.default)(app)
                .post(`/api/columns/${fx.todoColumnId}/cards`)
                .set((0, factories_1.authHeader)(viewer))
                .send({ title: 'nope' });
            expect(res.status).toBe(403);
        });
    });
    describe('users', () => {
        it('lists users', async () => {
            const user = await (0, factories_1.createUser)();
            const res = await (0, supertest_1.default)(app).get('/api/users').set((0, factories_1.authHeader)(user));
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.users)).toBe(true);
        });
        it('lets an admin change a role and forbids others', async () => {
            const admin = await (0, factories_1.createUser)({ role: client_1.Role.ADMIN });
            const target = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const dev = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const ok = await (0, supertest_1.default)(app)
                .patch(`/api/users/${target.id}/role`)
                .set((0, factories_1.authHeader)(admin))
                .send({ role: 'MANAGER' });
            expect(ok.status).toBe(200);
            const forbidden = await (0, supertest_1.default)(app)
                .patch(`/api/users/${target.id}/role`)
                .set((0, factories_1.authHeader)(dev))
                .send({ role: 'ADMIN' });
            expect(forbidden.status).toBe(403);
        });
        it('returns 404 when changing the role of an unknown user', async () => {
            const admin = await (0, factories_1.createUser)({ role: client_1.Role.ADMIN });
            const res = await (0, supertest_1.default)(app)
                .patch('/api/users/00000000-0000-0000-0000-000000000000/role')
                .set((0, factories_1.authHeader)(admin))
                .send({ role: 'DEVELOPER' });
            expect(res.status).toBe(404);
        });
    });
});
//# sourceMappingURL=extra.test.js.map