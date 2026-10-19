import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app';
import { resetDatabase, disconnectDatabase } from '../helpers/db';
import { createUser, authHeader } from '../helpers/factories';

const app = createApp();

describe('Auth API', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns tokens (TC-01)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'newuser@test.local',
        name: 'New User',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('newuser@test.local');
      expect(res.body.user.role).toBe(Role.DEVELOPER);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
    });

    it('rejects duplicate email with 409', async () => {
      const payload = { email: 'dup@test.local', name: 'Dup', password: 'Password123!' };
      await request(app).post('/api/auth/register').send(payload).expect(201);
      const res = await request(app).post('/api/auth/register').send(payload);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects weak password with 422', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'weak@test.local', name: 'Weak', password: '123' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      await createUser({ email: 'login@test.local', password: 'Password123!' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.local', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('rejects invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.local', password: 'wrong-password' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the current user with a valid token', async () => {
      const user = await createUser({ email: 'me@test.local' });
      const res = await request(app).get('/api/auth/me').set(authHeader(user));
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user.id);
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues new tokens from a refresh token', async () => {
      const user = await createUser({ email: 'refresh@test.local' });
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'Password123!' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: login.body.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });
  });
});
