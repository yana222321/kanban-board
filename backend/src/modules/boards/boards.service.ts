import { prisma } from '../../config/prisma';
import { AuthUser } from '../../middleware/auth';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { logActivity } from '../../services/activity';
import {
  assertCanContribute,
  assertCanManageProject,
  getProjectAccess,
  resolveProjectIdByBoard,
  resolveProjectIdByColumn,
} from '../../services/permissions';
import {
  CreateBoardInput,
  CreateColumnInput,
  ReorderColumnsInput,
  UpdateBoardInput,
  UpdateColumnInput,
} from './boards.schemas';

export async function createBoard(user: AuthUser, projectId: string, input: CreateBoardInput) {
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  const board = await prisma.board.create({
    data: {
      name: input.name,
      projectId,
      columns: {
        create: [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1, wipLimit: 3 },
          { name: 'Done', position: 2 },
        ],
      },
    },
    include: { columns: { orderBy: { position: 'asc' } } },
  });

  await logActivity(prisma, {
    action: 'CREATE',
    entity: 'Board',
    entityId: board.id,
    userId: user.id,
    projectId,
    newValue: { name: board.name },
  });

  return board;
}

export async function listBoards(user: AuthUser, projectId: string) {
  await getProjectAccess(prisma, user, projectId);
  return prisma.board.findMany({
    where: { projectId },
    include: { columns: { orderBy: { position: 'asc' } }, _count: { select: { columns: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getBoard(user: AuthUser, boardId: string) {
  const projectId = await resolveProjectIdByBoard(prisma, boardId);
  await getProjectAccess(prisma, user, projectId);

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              labels: true,
              _count: { select: { comments: true, attachments: true } },
            },
          },
        },
      },
    },
  });
  if (!board) {
    throw new NotFoundError('Board not found');
  }
  return board;
}

export async function updateBoard(user: AuthUser, boardId: string, input: UpdateBoardInput) {
  const projectId = await resolveProjectIdByBoard(prisma, boardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  return prisma.board.update({ where: { id: boardId }, data: { name: input.name } });
}

export async function deleteBoard(user: AuthUser, boardId: string) {
  const projectId = await resolveProjectIdByBoard(prisma, boardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  await prisma.board.delete({ where: { id: boardId } });
  return { id: boardId };
}

export async function createColumn(user: AuthUser, boardId: string, input: CreateColumnInput) {
  const projectId = await resolveProjectIdByBoard(prisma, boardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  const count = await prisma.column.count({ where: { boardId } });
  const column = await prisma.column.create({
    data: {
      name: input.name,
      boardId,
      wipLimit: input.wipLimit ?? null,
      position: count,
    },
  });

  await logActivity(prisma, {
    action: 'CREATE',
    entity: 'Column',
    entityId: column.id,
    userId: user.id,
    projectId,
    newValue: { name: column.name, wipLimit: column.wipLimit },
  });

  return column;
}

export async function updateColumn(user: AuthUser, columnId: string, input: UpdateColumnInput) {
  const projectId = await resolveProjectIdByColumn(prisma, columnId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  const updated = await prisma.column.update({
    where: { id: columnId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.wipLimit !== undefined ? { wipLimit: input.wipLimit } : {}),
    },
  });

  await logActivity(prisma, {
    action: 'UPDATE',
    entity: 'Column',
    entityId: columnId,
    userId: user.id,
    projectId,
    newValue: input,
  });

  return updated;
}

export async function deleteColumn(user: AuthUser, columnId: string) {
  const projectId = await resolveProjectIdByColumn(prisma, columnId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  await prisma.column.delete({ where: { id: columnId } });
  return { id: columnId };
}

export async function reorderColumns(user: AuthUser, boardId: string, input: ReorderColumnsInput) {
  const projectId = await resolveProjectIdByBoard(prisma, boardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  const columns = await prisma.column.findMany({ where: { boardId }, select: { id: true } });
  const existingIds = new Set(columns.map((c) => c.id));
  if (input.columnIds.length !== columns.length || !input.columnIds.every((id) => existingIds.has(id))) {
    throw new BadRequestError('columnIds must contain exactly all columns of the board');
  }

  await prisma.$transaction(
    input.columnIds.map((id, index) => prisma.column.update({ where: { id }, data: { position: index } })),
  );

  return prisma.column.findMany({ where: { boardId }, orderBy: { position: 'asc' } });
}

export async function assertContributeByBoard(boardId: string, user: AuthUser) {
  const projectId = await resolveProjectIdByBoard(prisma, boardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanContribute(access);
  return projectId;
}
