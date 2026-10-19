import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app';
import { resetDatabase, disconnectDatabase } from '../helpers/db';
import { createUser, createProjectFixture, authHeader } from '../helpers/factories';

const app = createApp();

describe('Boards & Columns API', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('creates a board with default columns', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const res = await request(app)
      .post(`/api/projects/${fx.projectId}/boards`)
      .set(authHeader(owner))
      .send({ name: 'Sprint Board' });

    expect(res.status).toBe(201);
    expect(res.body.board.columns).toHaveLength(3);
  });

  it('forbids a non-member from creating a board', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const outsider = await createUser({ role: Role.DEVELOPER });
    const fx = await createProjectFixture(owner);

    const res = await request(app)
      .post(`/api/projects/${fx.projectId}/boards`)
      .set(authHeader(outsider))
      .send({ name: 'Sneaky' });

    expect(res.status).toBe(403);
  });

  it('returns a board with columns and cards', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const res = await request(app).get(`/api/boards/${fx.boardId}`).set(authHeader(owner));
    expect(res.status).toBe(200);
    expect(res.body.board.columns.length).toBe(3);
    expect(Array.isArray(res.body.board.columns[0].cards)).toBe(true);
  });

  it('creates, renames and updates the WIP limit of a column', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const created = await request(app)
      .post(`/api/boards/${fx.boardId}/columns`)
      .set(authHeader(owner))
      .send({ name: 'Review', wipLimit: 2 });
    expect(created.status).toBe(201);
    const columnId = created.body.column.id;

    const updated = await request(app)
      .patch(`/api/columns/${columnId}`)
      .set(authHeader(owner))
      .send({ name: 'Code Review', wipLimit: 5 });
    expect(updated.status).toBe(200);
    expect(updated.body.column.name).toBe('Code Review');
    expect(updated.body.column.wipLimit).toBe(5);
  });

  it('reorders columns', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const res = await request(app)
      .patch(`/api/boards/${fx.boardId}/columns/reorder`)
      .set(authHeader(owner))
      .send({ columnIds: [fx.doneColumnId, fx.todoColumnId, fx.inProgressColumnId] });

    expect(res.status).toBe(200);
    expect(res.body.columns[0].id).toBe(fx.doneColumnId);
  });

  it('rejects a reorder payload that does not contain all columns', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const res = await request(app)
      .patch(`/api/boards/${fx.boardId}/columns/reorder`)
      .set(authHeader(owner))
      .send({ columnIds: [fx.todoColumnId] });

    expect(res.status).toBe(400);
  });

  it('deletes a column', async () => {
    const owner = await createUser({ role: Role.MANAGER });
    const fx = await createProjectFixture(owner);

    const res = await request(app).delete(`/api/columns/${fx.doneColumnId}`).set(authHeader(owner));
    expect(res.status).toBe(200);

    const board = await request(app).get(`/api/boards/${fx.boardId}`).set(authHeader(owner));
    expect(board.body.board.columns).toHaveLength(2);
  });
});
