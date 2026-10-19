import request from 'supertest';
import { Priority, Role } from '@prisma/client';
import { createApp } from '../../src/app';
import { resetDatabase, disconnectDatabase } from '../helpers/db';
import { createUser, createProjectFixture, createCardDirect, authHeader } from '../helpers/factories';

const app = createApp();

describe('Cards API', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('creates a card in a column (TC-02)', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const res = await request(app)
      .post(`/api/columns/${fx.todoColumnId}/cards`)
      .set(authHeader(owner))
      .send({ title: 'Implement login', priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body.card.title).toBe('Implement login');
    expect(res.body.card.priority).toBe('HIGH');
  });

  it('rejects a card with an empty title (TC-05)', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const res = await request(app)
      .post(`/api/columns/${fx.todoColumnId}/cards`)
      .set(authHeader(owner))
      .send({ title: '' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an assignee that is not a project member', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const stranger = await createUser({ role: Role.DEVELOPER });
    const fx = await createProjectFixture(owner);

    const res = await request(app)
      .post(`/api/columns/${fx.todoColumnId}/cards`)
      .set(authHeader(owner))
      .send({ title: 'Assigned', assigneeId: stranger.id });

    expect(res.status).toBe(400);
  });

  it('moves a card between columns (TC-03)', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);
    const card = await createCardDirect(fx.todoColumnId, owner.id, { title: 'Move me' });

    const res = await request(app)
      .patch(`/api/cards/${card.id}/move`)
      .set(authHeader(owner))
      .send({ columnId: fx.inProgressColumnId, position: 0 });

    expect(res.status).toBe(200);
    expect(res.body.card.columnId).toBe(fx.inProgressColumnId);
  });

  it('blocks a move that exceeds the WIP limit (TC-07)', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner, { wipLimit: 1 });
    const cardA = await createCardDirect(fx.todoColumnId, owner.id, { title: 'A' });
    const cardB = await createCardDirect(fx.todoColumnId, owner.id, { title: 'B' });

    await request(app)
      .patch(`/api/cards/${cardA.id}/move`)
      .set(authHeader(owner))
      .send({ columnId: fx.inProgressColumnId, position: 0 })
      .expect(200);

    const res = await request(app)
      .patch(`/api/cards/${cardB.id}/move`)
      .set(authHeader(owner))
      .send({ columnId: fx.inProgressColumnId, position: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toMatch(/WIP limit/i);
  });

  it('searches cards by text (TC-06)', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);
    await createCardDirect(fx.todoColumnId, owner.id, { title: 'Fix login bug' });
    await createCardDirect(fx.todoColumnId, owner.id, { title: 'Write docs' });

    const res = await request(app)
      .get(`/api/boards/${fx.boardId}/cards`)
      .query({ search: 'login' })
      .set(authHeader(owner));

    expect(res.status).toBe(200);
    expect(res.body.cards).toHaveLength(1);
    expect(res.body.cards[0].title).toBe('Fix login bug');
  });

  it('filters cards by priority', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);
    await createCardDirect(fx.todoColumnId, owner.id, { title: 'Urgent one', priority: Priority.URGENT });
    await createCardDirect(fx.todoColumnId, owner.id, { title: 'Low one', priority: Priority.LOW });

    const res = await request(app)
      .get(`/api/boards/${fx.boardId}/cards`)
      .query({ priority: 'URGENT' })
      .set(authHeader(owner));

    expect(res.body.cards).toHaveLength(1);
    expect(res.body.cards[0].priority).toBe('URGENT');
  });

  describe('comments', () => {
    it('adds and lists comments', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const card = await createCardDirect(fx.todoColumnId, owner.id);

      const add = await request(app)
        .post(`/api/cards/${card.id}/comments`)
        .set(authHeader(owner))
        .send({ body: 'Looks good' });
      expect(add.status).toBe(201);

      const list = await request(app).get(`/api/cards/${card.id}/comments`).set(authHeader(owner));
      expect(list.body.comments).toHaveLength(1);
      expect(list.body.comments[0].body).toBe('Looks good');
    });

    it('prevents a developer from deleting someone else’s comment', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const dev = await createUser({ role: Role.DEVELOPER });
      const fx = await createProjectFixture(owner, { memberIds: [dev.id] });
      const card = await createCardDirect(fx.todoColumnId, owner.id);

      const add = await request(app)
        .post(`/api/cards/${card.id}/comments`)
        .set(authHeader(owner))
        .send({ body: 'Mine' });

      const res = await request(app)
        .delete(`/api/comments/${add.body.comment.id}`)
        .set(authHeader(dev));
      expect(res.status).toBe(403);
    });
  });

  it('records card history', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const created = await request(app)
      .post(`/api/columns/${fx.todoColumnId}/cards`)
      .set(authHeader(owner))
      .send({ title: 'Tracked' });
    const cardId = created.body.card.id;

    await request(app)
      .patch(`/api/cards/${cardId}/move`)
      .set(authHeader(owner))
      .send({ columnId: fx.inProgressColumnId, position: 0 });

    const history = await request(app).get(`/api/cards/${cardId}/history`).set(authHeader(owner));
    expect(history.status).toBe(200);
    const actions = history.body.history.map((h: { action: string }) => h.action);
    expect(actions).toContain('CREATE');
    expect(actions).toContain('MOVE');
  });

  describe('labels', () => {
    it('creates a label and attaches it to a card, then filters by it', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);

      const label = await request(app)
        .post(`/api/projects/${fx.projectId}/labels`)
        .set(authHeader(owner))
        .send({ name: 'urgent', color: '#ff0000' });
      expect(label.status).toBe(201);

      const card = await request(app)
        .post(`/api/columns/${fx.todoColumnId}/cards`)
        .set(authHeader(owner))
        .send({ title: 'Labelled', labelIds: [label.body.label.id] });
      expect(card.status).toBe(201);
      expect(card.body.card.labels).toHaveLength(1);

      const filtered = await request(app)
        .get(`/api/boards/${fx.boardId}/cards`)
        .query({ labelId: label.body.label.id })
        .set(authHeader(owner));
      expect(filtered.body.cards).toHaveLength(1);
    });
  });

  describe('attachments', () => {
    it('uploads and lists an attachment', async () => {
      const owner = await createUser({ role: Role.MANAGER });
      const fx = await createProjectFixture(owner);
      const card = await createCardDirect(fx.todoColumnId, owner.id);

      const upload = await request(app)
        .post(`/api/cards/${card.id}/attachments`)
        .set(authHeader(owner))
        .attach('file', Buffer.from('hello world'), 'note.txt');

      expect(upload.status).toBe(201);
      expect(upload.body.attachment.filename).toBe('note.txt');

      const list = await request(app).get(`/api/cards/${card.id}/attachments`).set(authHeader(owner));
      expect(list.body.attachments).toHaveLength(1);
    });
  });
});
