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
describe('Auth API', () => {
    beforeAll(async () => {
        await (0, db_1.resetDatabase)();
    });
    afterAll(async () => {
        await (0, db_1.disconnectDatabase)();
    });
    describe('POST /api/auth/register', () => {
        it('registers a new user and returns tokens (TC-01)', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/auth/register').send({
                email: 'newuser@test.local',
                name: 'New User',
                password: 'Password123!',
            });
            expect(res.status).toBe(201);
            expect(res.body.user.email).toBe('newuser@test.local');
            expect(res.body.user.role).toBe(client_1.Role.DEVELOPER);
            expect(res.body.user.passwordHash).toBeUndefined();
            expect(res.body.accessToken).toEqual(expect.any(String));
            expect(res.body.refreshToken).toEqual(expect.any(String));
        });
        it('rejects duplicate email with 409', async () => {
            const payload = { email: 'dup@test.local', name: 'Dup', password: 'Password123!' };
            await (0, supertest_1.default)(app).post('/api/auth/register').send(payload).expect(201);
            const res = await (0, supertest_1.default)(app).post('/api/auth/register').send(payload);
            expect(res.status).toBe(409);
            expect(res.body.error.code).toBe('CONFLICT');
        });
        it('rejects weak password with 422', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({ email: 'weak@test.local', name: 'Weak', password: '123' });
            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
    describe('POST /api/auth/login', () => {
        it('logs in with valid credentials', async () => {
            await (0, factories_1.createUser)({ email: 'login@test.local', password: 'Password123!' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({ email: 'login@test.local', password: 'Password123!' });
            expect(res.status).toBe(200);
            expect(res.body.accessToken).toEqual(expect.any(String));
        });
        it('rejects invalid credentials with 401', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({ email: 'login@test.local', password: 'wrong-password' });
            expect(res.status).toBe(401);
        });
    });
    describe('GET /api/auth/me', () => {
        it('returns the current user with a valid token', async () => {
            const user = await (0, factories_1.createUser)({ email: 'me@test.local' });
            const res = await (0, supertest_1.default)(app).get('/api/auth/me').set((0, factories_1.authHeader)(user));
            expect(res.status).toBe(200);
            expect(res.body.user.id).toBe(user.id);
        });
        it('returns 401 without a token', async () => {
            const res = await (0, supertest_1.default)(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });
    });
    describe('POST /api/auth/refresh', () => {
        it('issues new tokens from a refresh token', async () => {
            const user = await (0, factories_1.createUser)({ email: 'refresh@test.local' });
            const login = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({ email: user.email, password: 'Password123!' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: login.body.refreshToken });
            expect(res.status).toBe(200);
            expect(res.body.accessToken).toEqual(expect.any(String));
        });
    });
});
//# sourceMappingURL=auth.test.js.map