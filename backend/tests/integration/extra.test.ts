import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app';
import { resetDatabase, disconnectDatabase } from '../helpers/db';
import { createUser, createProjectFixture, createCardDirect, authHeader } from '../helpers/factories';

const app = createApp();

describe('Additional coverage', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('serves the health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('rejects a malformed bearer token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('rejects a refresh token used as an access token', async () => {
    const user = await createUser();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Password123!' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.refreshToken}`);
    expect(res.status).toBe(401);
  });

  it('rejects a missing Authorization scheme', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  it('returns 404 for resolver lookups of unknown resources', async () => {
    const user = await createUser({ role: Role.MANAGER });
    const randomId = '00000000-0000-0000-0000-000000000000';

    expect((await request(app).get(`/api/boards/${randomId}`).set(authHeader(user))).status).toBe(404);
    expect((await request(app).get(`/api/cards/${randomId}`).set(authHeader(user))).status).toBe(404);
    expect((await request(app).get(`/api/cards/${randomId}/comments`).set(authHeader(user))).status).toBe(
      404,
    );
    expect(
      (await request(app).patch(`/api/columns/${randomId}`).set(authHeader(user)).send({ name: 'x' }))
        .status,
    ).toBe(404);
  });

  it('rejects an invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'garbage' });
    expect(res.status).toBe(401);
  });

  it('logs out with 204', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/auth/logout').set(authHeader(user));
    expect(res.status).toBe(204);
  });

  describe('projects', () => {
    it('updates a project as the owner', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const res = await request(app)
        .patch(`/api/projects/${fx.projectId}`)
        .set(authHeader(owner))
        .send({ name: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.project.name).toBe('Renamed');
    });

    it('rejects an empty update payload', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const res = await request(app).patch(`/api/projects/${fx.projectId}`).set(authHeader(owner)).send({});
      expect(res.status).toBe(422);
    });

    it('forbids a developer from updating a project', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const dev = await createUser({ role: Role.DEVELOPER });
      const fx = await createProjectFixture(owner, { memberIds: [dev.id] });
      const res = await request(app)
        .patch(`/api/projects/${fx.projectId}`)
        .set(authHeader(dev))
        .send({ name: 'Nope' });
      expect(res.status).toBe(403);
    });

    it('lists, updates and removes members', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const dev = await createUser({ role: Role.DEVELOPER });
      const fx = await createProjectFixture(owner, { memberIds: [dev.id] });

      const list = await request(app)
        .get(`/api/projects/${fx.projectId}/members`)
        .set(authHeader(owner));
      expect(list.status).toBe(200);
      const membership = list.body.members.find((m: { userId: string }) => m.userId === dev.id);
      expect(membership).toBeDefined();

      const update = await request(app)
        .patch(`/api/projects/${fx.projectId}/members/${membership.id}`)
        .set(authHeader(owner))
        .send({ role: 'VIEWER' });
      expect(update.status).toBe(200);
      expect(update.body.member.role).toBe('VIEWER');

      const remove = await request(app)
        .delete(`/api/projects/${fx.projectId}/members/${membership.id}`)
        .set(authHeader(owner));
      expect(remove.status).toBe(200);
    });

    it('returns 404 when adding an unknown user', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const res = await request(app)
        .post(`/api/projects/${fx.projectId}/members`)
        .set(authHeader(owner))
        .send({ email: 'nobody@nowhere.local' });
      expect(res.status).toBe(404);
    });
  });

  describe('boards', () => {
    it('renames and deletes a board', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);

      const update = await request(app)
        .patch(`/api/boards/${fx.boardId}`)
        .set(authHeader(owner))
        .send({ name: 'Renamed Board' });
      expect(update.status).toBe(200);

      const remove = await request(app).delete(`/api/boards/${fx.boardId}`).set(authHeader(owner));
      expect(remove.status).toBe(200);
    });

    it('lists boards of a project', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const res = await request(app)
        .post('/api/projects')
        .set(authHeader(owner))
        .send({ name: 'P', key: `K${Date.now().toString().slice(-6)}` });
      const projectId = res.body.project.id;

      const list = await request(app).get(`/api/projects/${projectId}/boards`).set(authHeader(owner));
      expect(list.status).toBe(200);
      expect(list.body.boards.length).toBe(1);
    });
  });

  describe('cards', () => {
    it('gets, updates and deletes a card', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const dev = await createUser({ role: Role.DEVELOPER });
      const fx = await createProjectFixture(owner, { memberIds: [dev.id] });
      const card = await createCardDirect(fx.todoColumnId, owner.id, { title: 'Original' });

      const get = await request(app).get(`/api/cards/${card.id}`).set(authHeader(owner));
      expect(get.status).toBe(200);

      const update = await request(app)
        .patch(`/api/cards/${card.id}`)
        .set(authHeader(owner))
        .send({ title: 'Updated', priority: 'LOW', assigneeId: dev.id });
      expect(update.status).toBe(200);
      expect(update.body.card.title).toBe('Updated');
      expect(update.body.card.assigneeId).toBe(dev.id);

      const remove = await request(app).delete(`/api/cards/${card.id}`).set(authHeader(owner));
      expect(remove.status).toBe(200);
    });

    it('reorders cards within the same column', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const first = await createCardDirect(fx.todoColumnId, owner.id, { title: 'First', position: 0 });
      const second = await createCardDirect(fx.todoColumnId, owner.id, { title: 'Second', position: 1 });

      const res = await request(app)
        .patch(`/api/cards/${second.id}/move`)
        .set(authHeader(owner))
        .send({ columnId: fx.todoColumnId, position: 0 });
      expect(res.status).toBe(200);

      const board = await request(app).get(`/api/boards/${fx.boardId}`).set(authHeader(owner));
      const todo = board.body.board.columns.find((c: { id: string }) => c.id === fx.todoColumnId);
      expect(todo.cards[0].id).toBe(second.id);
      expect(todo.cards[1].id).toBe(first.id);
    });

    it('rejects moving a card to another board', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const other = await createProjectFixture(owner);
      const card = await createCardDirect(fx.todoColumnId, owner.id);

      const res = await request(app)
        .patch(`/api/cards/${card.id}/move`)
        .set(authHeader(owner))
        .send({ columnId: other.todoColumnId, position: 0 });
      expect(res.status).toBe(400);
    });

    it('deletes an own comment and an attachment', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const card = await createCardDirect(fx.todoColumnId, owner.id);

      const comment = await request(app)
        .post(`/api/cards/${card.id}/comments`)
        .set(authHeader(owner))
        .send({ body: 'temp' });
      const delComment = await request(app)
        .delete(`/api/comments/${comment.body.comment.id}`)
        .set(authHeader(owner));
      expect(delComment.status).toBe(200);

      const upload = await request(app)
        .post(`/api/cards/${card.id}/attachments`)
        .set(authHeader(owner))
        .attach('file', Buffer.from('data'), 'file.txt');
      const delAttachment = await request(app)
        .delete(`/api/attachments/${upload.body.attachment.id}`)
        .set(authHeader(owner));
      expect(delAttachment.status).toBe(200);
    });

    it('updates and deletes labels', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);

      const created = await request(app)
        .post(`/api/projects/${fx.projectId}/labels`)
        .set(authHeader(owner))
        .send({ name: 'temp', color: '#123456' });

      const list = await request(app).get(`/api/projects/${fx.projectId}/labels`).set(authHeader(owner));
      expect(list.status).toBe(200);

      const update = await request(app)
        .patch(`/api/projects/${fx.projectId}/labels/${created.body.label.id}`)
        .set(authHeader(owner))
        .send({ name: 'renamed' });
      expect(update.status).toBe(200);

      const remove = await request(app)
        .delete(`/api/projects/${fx.projectId}/labels/${created.body.label.id}`)
        .set(authHeader(owner));
      expect(remove.status).toBe(200);
    });

    it('returns 409 when a label name already exists', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);

      await request(app)
        .post(`/api/projects/${fx.projectId}/labels`)
        .set(authHeader(owner))
        .send({ name: 'duplicate', color: '#111111' })
        .expect(201);

      const res = await request(app)
        .post(`/api/projects/${fx.projectId}/labels`)
        .set(authHeader(owner))
        .send({ name: 'duplicate', color: '#222222' });
      expect(res.status).toBe(409);
    });

    it('rejects a label that does not belong to the project', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const other = await createProjectFixture(owner);
      const otherLabel = await request(app)
        .post(`/api/projects/${other.projectId}/labels`)
        .set(authHeader(owner))
        .send({ name: 'foreign', color: '#333333' });

      const res = await request(app)
        .post(`/api/columns/${fx.todoColumnId}/cards`)
        .set(authHeader(owner))
        .send({ title: 'x', labelIds: [otherLabel.body.label.id] });
      expect(res.status).toBe(400);
    });

    it('rejects an assignee that is not a member on update', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const stranger = await createUser({ role: Role.DEVELOPER });
      const fx = await createProjectFixture(owner);
      const card = await createCardDirect(fx.todoColumnId, owner.id);

      const res = await request(app)
        .patch(`/api/cards/${card.id}`)
        .set(authHeader(owner))
        .send({ assigneeId: stranger.id });
      expect(res.status).toBe(400);
    });

    it('forbids a viewer from creating a card', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const viewer = await createUser({ role: Role.DEVELOPER });
      const fx = await createProjectFixture(owner);
      await request(app)
        .post(`/api/projects/${fx.projectId}/members`)
        .set(authHeader(owner))
        .send({ email: viewer.email, role: 'VIEWER' });

      const res = await request(app)
        .post(`/api/columns/${fx.todoColumnId}/cards`)
        .set(authHeader(viewer))
        .send({ title: 'nope' });
      expect(res.status).toBe(403);
    });
  });

  describe('users', () => {
    it('lists users', async () => {
      const user = await createUser();
      const res = await request(app).get('/api/users').set(authHeader(user));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('lets an admin change a role and forbids others', async () => {
      const admin = await createUser({ role: Role.ADMIN });
      const target = await createUser({ role: Role.DEVELOPER });
      const dev = await createUser({ role: Role.DEVELOPER });

      const ok = await request(app)
        .patch(`/api/users/${target.id}/role`)
        .set(authHeader(admin))
        .send({ role: 'MANAGER' });
      expect(ok.status).toBe(200);

      const forbidden = await request(app)
        .patch(`/api/users/${target.id}/role`)
        .set(authHeader(dev))
        .send({ role: 'ADMIN' });
      expect(forbidden.status).toBe(403);
    });

    it('returns 404 when changing the role of an unknown user', async () => {
      const admin = await createUser({ role: Role.ADMIN });
      const res = await request(app)
        .patch('/api/users/00000000-0000-0000-0000-000000000000/role')
        .set(authHeader(admin))
        .send({ role: 'DEVELOPER' });
      expect(res.status).toBe(404);
    });
  });
});
