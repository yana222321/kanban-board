import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app';
import { resetDatabase, disconnectDatabase } from '../helpers/db';
import { createUser, createProjectFixture, authHeader } from '../helpers/factories';

const app = createApp();

describe('Projects API', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/projects', () => {
    it('lets a manager create a project with a default board (TC-02 setup)', async () => {
      const manager = await createUser({ role: Role.MANAGER });
      const res = await request(app)
        .post('/api/projects')
        .set(authHeader(manager))
        .send({ name: 'My Project', key: 'MYPROJ', description: 'Test' });

      expect(res.status).toBe(201);
      expect(res.body.project.key).toBe('MYPROJ');
      expect(res.body.project.boards).toHaveLength(1);
      expect(res.body.project.boards[0].columns).toHaveLength(3);
    });

    it('rejects a developer with 403', async () => {
      const dev = await createUser({ role: Role.DEVELOPER });
      const res = await request(app)
        .post('/api/projects')
        .set(authHeader(dev))
        .send({ name: 'Nope', key: 'NOPE1' });
      expect(res.status).toBe(403);
    });

    it('rejects duplicate project key with 409', async () => {
      const manager = await createUser({ role: Role.MANAGER });
      await request(app)
        .post('/api/projects')
        .set(authHeader(manager))
        .send({ name: 'First', key: 'DUPKEY' })
        .expect(201);
      const res = await request(app)
        .post('/api/projects')
        .set(authHeader(manager))
        .send({ name: 'Second', key: 'DUPKEY' });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/projects', () => {
    it('lists only projects the user can access', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const outsider = await createUser({ role: Role.DEVELOPER });
      await createProjectFixture(owner);

      const ownerList = await request(app).get('/api/projects').set(authHeader(owner));
      expect(ownerList.status).toBe(200);
      expect(ownerList.body.projects.length).toBeGreaterThanOrEqual(1);

      const outsiderList = await request(app).get('/api/projects').set(authHeader(outsider));
      expect(outsiderList.body.projects).toHaveLength(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns a project for a member', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const res = await request(app).get(`/api/projects/${fx.projectId}`).set(authHeader(owner));
      expect(res.status).toBe(200);
      expect(res.body.project.id).toBe(fx.projectId);
    });

    it('returns 403 for a non-member', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const outsider = await createUser({ role: Role.DEVELOPER });
      const fx = await createProjectFixture(owner);
      const res = await request(app).get(`/api/projects/${fx.projectId}`).set(authHeader(outsider));
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('forbids a developer member from deleting a project (TC-04)', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const dev = await createUser({ role: Role.DEVELOPER });
      const fx = await createProjectFixture(owner, { memberIds: [dev.id] });

      const res = await request(app).delete(`/api/projects/${fx.projectId}`).set(authHeader(dev));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows the owner to delete the project', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const res = await request(app).delete(`/api/projects/${fx.projectId}`).set(authHeader(owner));
      expect(res.status).toBe(200);
    });

    it('allows an admin to delete any project', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const admin = await createUser({ role: Role.ADMIN });
      const fx = await createProjectFixture(owner);
      const res = await request(app).delete(`/api/projects/${fx.projectId}`).set(authHeader(admin));
      expect(res.status).toBe(200);
    });
  });

  describe('members', () => {
    it('lets a manager add a member by email', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const invitee = await createUser({ email: `invitee-${Date.now()}@test.local` });
      const fx = await createProjectFixture(owner);

      const res = await request(app)
        .post(`/api/projects/${fx.projectId}/members`)
        .set(authHeader(owner))
        .send({ email: invitee.email, role: 'DEVELOPER' });

      expect(res.status).toBe(201);
      expect(res.body.member.user.email).toBe(invitee.email);
    });
  });
});
