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
describe('Cards API', () => {
    beforeAll(async () => {
        await (0, db_1.resetDatabase)();
    });
    afterAll(async () => {
        await (0, db_1.disconnectDatabase)();
    });
    it('creates a card in a column (TC-02)', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app)
            .post(`/api/columns/${fx.todoColumnId}/cards`)
            .set((0, factories_1.authHeader)(owner))
            .send({ title: 'Implement login', priority: 'HIGH' });
        expect(res.status).toBe(201);
        expect(res.body.card.title).toBe('Implement login');
        expect(res.body.card.priority).toBe('HIGH');
    });
    it('rejects a card with an empty title (TC-05)', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app)
            .post(`/api/columns/${fx.todoColumnId}/cards`)
            .set((0, factories_1.authHeader)(owner))
            .send({ title: '' });
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('rejects an assignee that is not a project member', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const stranger = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const res = await (0, supertest_1.default)(app)
            .post(`/api/columns/${fx.todoColumnId}/cards`)
            .set((0, factories_1.authHeader)(owner))
            .send({ title: 'Assigned', assigneeId: stranger.id });
        expect(res.status).toBe(400);
    });
    it('moves a card between columns (TC-03)', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const card = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'Move me' });
        const res = await (0, supertest_1.default)(app)
            .patch(`/api/cards/${card.id}/move`)
            .set((0, factories_1.authHeader)(owner))
            .send({ columnId: fx.inProgressColumnId, position: 0 });
        expect(res.status).toBe(200);
        expect(res.body.card.columnId).toBe(fx.inProgressColumnId);
    });
    it('blocks a move that exceeds the WIP limit (TC-07)', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner, { wipLimit: 1 });
        const cardA = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'A' });
        const cardB = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'B' });
        await (0, supertest_1.default)(app)
            .patch(`/api/cards/${cardA.id}/move`)
            .set((0, factories_1.authHeader)(owner))
            .send({ columnId: fx.inProgressColumnId, position: 0 })
            .expect(200);
        const res = await (0, supertest_1.default)(app)
            .patch(`/api/cards/${cardB.id}/move`)
            .set((0, factories_1.authHeader)(owner))
            .send({ columnId: fx.inProgressColumnId, position: 1 });
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
        expect(res.body.error.message).toMatch(/WIP limit/i);
    });
    it('searches cards by text (TC-06)', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'Fix login bug' });
        await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'Write docs' });
        const res = await (0, supertest_1.default)(app)
            .get(`/api/boards/${fx.boardId}/cards`)
            .query({ search: 'login' })
            .set((0, factories_1.authHeader)(owner));
        expect(res.status).toBe(200);
        expect(res.body.cards).toHaveLength(1);
        expect(res.body.cards[0].title).toBe('Fix login bug');
    });
    it('filters cards by priority', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'Urgent one', priority: client_1.Priority.URGENT });
        await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id, { title: 'Low one', priority: client_1.Priority.LOW });
        const res = await (0, supertest_1.default)(app)
            .get(`/api/boards/${fx.boardId}/cards`)
            .query({ priority: 'URGENT' })
            .set((0, factories_1.authHeader)(owner));
        expect(res.body.cards).toHaveLength(1);
        expect(res.body.cards[0].priority).toBe('URGENT');
    });
    describe('comments', () => {
        it('adds and lists comments', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const card = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id);
            const add = await (0, supertest_1.default)(app)
                .post(`/api/cards/${card.id}/comments`)
                .set((0, factories_1.authHeader)(owner))
                .send({ body: 'Looks good' });
            expect(add.status).toBe(201);
            const list = await (0, supertest_1.default)(app).get(`/api/cards/${card.id}/comments`).set((0, factories_1.authHeader)(owner));
            expect(list.body.comments).toHaveLength(1);
            expect(list.body.comments[0].body).toBe('Looks good');
        });
        it('prevents a developer from deleting someone else’s comment', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const dev = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const fx = await (0, factories_1.createProjectFixture)(owner, { memberIds: [dev.id] });
            const card = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id);
            const add = await (0, supertest_1.default)(app)
                .post(`/api/cards/${card.id}/comments`)
                .set((0, factories_1.authHeader)(owner))
                .send({ body: 'Mine' });
            const res = await (0, supertest_1.default)(app)
                .delete(`/api/comments/${add.body.comment.id}`)
                .set((0, factories_1.authHeader)(dev));
            expect(res.status).toBe(403);
        });
    });
    it('records card history', async () => {
        const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
        const fx = await (0, factories_1.createProjectFixture)(owner);
        const created = await (0, supertest_1.default)(app)
            .post(`/api/columns/${fx.todoColumnId}/cards`)
            .set((0, factories_1.authHeader)(owner))
            .send({ title: 'Tracked' });
        const cardId = created.body.card.id;
        await (0, supertest_1.default)(app)
            .patch(`/api/cards/${cardId}/move`)
            .set((0, factories_1.authHeader)(owner))
            .send({ columnId: fx.inProgressColumnId, position: 0 });
        const history = await (0, supertest_1.default)(app).get(`/api/cards/${cardId}/history`).set((0, factories_1.authHeader)(owner));
        expect(history.status).toBe(200);
        const actions = history.body.history.map((h) => h.action);
        expect(actions).toContain('CREATE');
        expect(actions).toContain('MOVE');
    });
    describe('labels', () => {
        it('creates a label and attaches it to a card, then filters by it', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const label = await (0, supertest_1.default)(app)
                .post(`/api/projects/${fx.projectId}/labels`)
                .set((0, factories_1.authHeader)(owner))
                .send({ name: 'urgent', color: '#ff0000' });
            expect(label.status).toBe(201);
            const card = await (0, supertest_1.default)(app)
                .post(`/api/columns/${fx.todoColumnId}/cards`)
                .set((0, factories_1.authHeader)(owner))
                .send({ title: 'Labelled', labelIds: [label.body.label.id] });
            expect(card.status).toBe(201);
            expect(card.body.card.labels).toHaveLength(1);
            const filtered = await (0, supertest_1.default)(app)
                .get(`/api/boards/${fx.boardId}/cards`)
                .query({ labelId: label.body.label.id })
                .set((0, factories_1.authHeader)(owner));
            expect(filtered.body.cards).toHaveLength(1);
        });
    });
    describe('attachments', () => {
        it('uploads and lists an attachment', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const card = await (0, factories_1.createCardDirect)(fx.todoColumnId, owner.id);
            const upload = await (0, supertest_1.default)(app)
                .post(`/api/cards/${card.id}/attachments`)
                .set((0, factories_1.authHeader)(owner))
                .attach('file', Buffer.from('hello world'), 'note.txt');
            expect(upload.status).toBe(201);
            expect(upload.body.attachment.filename).toBe('note.txt');
            const list = await (0, supertest_1.default)(app).get(`/api/cards/${card.id}/attachments`).set((0, factories_1.authHeader)(owner));
            expect(list.body.attachments).toHaveLength(1);
        });
    });
});
//# sourceMappingURL=cards.test.js.map