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
describe('Projects API', () => {
    beforeAll(async () => {
        await (0, db_1.resetDatabase)();
    });
    afterAll(async () => {
        await (0, db_1.disconnectDatabase)();
    });
    describe('POST /api/projects', () => {
        it('lets a manager create a project with a default board (TC-02 setup)', async () => {
            const manager = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const res = await (0, supertest_1.default)(app)
                .post('/api/projects')
                .set((0, factories_1.authHeader)(manager))
                .send({ name: 'My Project', key: 'MYPROJ', description: 'Test' });
            expect(res.status).toBe(201);
            expect(res.body.project.key).toBe('MYPROJ');
            expect(res.body.project.boards).toHaveLength(1);
            expect(res.body.project.boards[0].columns).toHaveLength(3);
        });
        it('rejects a developer with 403', async () => {
            const dev = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const res = await (0, supertest_1.default)(app)
                .post('/api/projects')
                .set((0, factories_1.authHeader)(dev))
                .send({ name: 'Nope', key: 'NOPE1' });
            expect(res.status).toBe(403);
        });
        it('rejects duplicate project key with 409', async () => {
            const manager = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            await (0, supertest_1.default)(app)
                .post('/api/projects')
                .set((0, factories_1.authHeader)(manager))
                .send({ name: 'First', key: 'DUPKEY' })
                .expect(201);
            const res = await (0, supertest_1.default)(app)
                .post('/api/projects')
                .set((0, factories_1.authHeader)(manager))
                .send({ name: 'Second', key: 'DUPKEY' });
            expect(res.status).toBe(409);
        });
    });
    describe('GET /api/projects', () => {
        it('lists only projects the user can access', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const outsider = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            await (0, factories_1.createProjectFixture)(owner);
            const ownerList = await (0, supertest_1.default)(app).get('/api/projects').set((0, factories_1.authHeader)(owner));
            expect(ownerList.status).toBe(200);
            expect(ownerList.body.projects.length).toBeGreaterThanOrEqual(1);
            const outsiderList = await (0, supertest_1.default)(app).get('/api/projects').set((0, factories_1.authHeader)(outsider));
            expect(outsiderList.body.projects).toHaveLength(0);
        });
    });
    describe('GET /api/projects/:id', () => {
        it('returns a project for a member', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const res = await (0, supertest_1.default)(app).get(`/api/projects/${fx.projectId}`).set((0, factories_1.authHeader)(owner));
            expect(res.status).toBe(200);
            expect(res.body.project.id).toBe(fx.projectId);
        });
        it('returns 403 for a non-member', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const outsider = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const res = await (0, supertest_1.default)(app).get(`/api/projects/${fx.projectId}`).set((0, factories_1.authHeader)(outsider));
            expect(res.status).toBe(403);
        });
    });
    describe('DELETE /api/projects/:id', () => {
        it('forbids a developer member from deleting a project (TC-04)', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const dev = await (0, factories_1.createUser)({ role: client_1.Role.DEVELOPER });
            const fx = await (0, factories_1.createProjectFixture)(owner, { memberIds: [dev.id] });
            const res = await (0, supertest_1.default)(app).delete(`/api/projects/${fx.projectId}`).set((0, factories_1.authHeader)(dev));
            expect(res.status).toBe(403);
            expect(res.body.error.code).toBe('FORBIDDEN');
        });
        it('allows the owner to delete the project', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const res = await (0, supertest_1.default)(app).delete(`/api/projects/${fx.projectId}`).set((0, factories_1.authHeader)(owner));
            expect(res.status).toBe(200);
        });
        it('allows an admin to delete any project', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const admin = await (0, factories_1.createUser)({ role: client_1.Role.ADMIN });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const res = await (0, supertest_1.default)(app).delete(`/api/projects/${fx.projectId}`).set((0, factories_1.authHeader)(admin));
            expect(res.status).toBe(200);
        });
    });
    describe('members', () => {
        it('lets a manager add a member by email', async () => {
            const owner = await (0, factories_1.createUser)({ role: client_1.Role.MANAGER });
            const invitee = await (0, factories_1.createUser)({ email: `invitee-${Date.now()}@test.local` });
            const fx = await (0, factories_1.createProjectFixture)(owner);
            const res = await (0, supertest_1.default)(app)
                .post(`/api/projects/${fx.projectId}/members`)
                .set((0, factories_1.authHeader)(owner))
                .send({ email: invitee.email, role: 'DEVELOPER' });
            expect(res.status).toBe(201);
            expect(res.body.member.user.email).toBe(invitee.email);
        });
    });
});
//# sourceMappingURL=projects.test.js.map