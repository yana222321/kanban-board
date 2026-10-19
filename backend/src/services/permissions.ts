import { MemberRole, PrismaClient, Project } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';

export type AccessLevel = 'ADMIN' | 'OWNER' | MemberRole;

export interface ProjectAccess {
  project: Project;
  level: AccessLevel;
  isMember: boolean;
}

type Db = PrismaClient;

export async function getProjectAccess(db: Db, user: AuthUser, projectId: string): Promise<ProjectAccess> {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  if (user.role === 'ADMIN') {
    return { project, level: 'ADMIN', isMember: true };
  }
  if (project.ownerId === user.id) {
    return { project, level: 'OWNER', isMember: true };
  }
  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!membership) {
    throw new ForbiddenError('You do not have access to this project');
  }
  return { project, level: membership.role, isMember: true };
}

export function canView(level: AccessLevel): boolean {
  return true; // anyone with access can view
}

export function canManageProject(level: AccessLevel): boolean {
  return level === 'ADMIN' || level === 'OWNER' || level === 'MANAGER';
}

export function canContribute(level: AccessLevel): boolean {
  return level === 'ADMIN' || level === 'OWNER' || level === 'MANAGER' || level === 'DEVELOPER';
}

export function canDeleteProject(level: AccessLevel): boolean {
  return level === 'ADMIN' || level === 'OWNER';
}

export function assertCanManageProject(access: ProjectAccess): void {
  if (!canManageProject(access.level)) {
    throw new ForbiddenError('You cannot manage this project');
  }
}

export function assertCanContribute(access: ProjectAccess): void {
  if (!canContribute(access.level)) {
    throw new ForbiddenError('You cannot modify content in this project');
  }
}

export function assertCanDeleteProject(access: ProjectAccess): void {
  if (!canDeleteProject(access.level)) {
    throw new ForbiddenError('You cannot delete this project');
  }
}

export async function resolveProjectIdByBoard(db: Db, boardId: string): Promise<string> {
  const board = await db.board.findUnique({ where: { id: boardId }, select: { projectId: true } });
  if (!board) {
    throw new NotFoundError('Board not found');
  }
  return board.projectId;
}

export async function resolveProjectIdByColumn(db: Db, columnId: string): Promise<string> {
  const column = await db.column.findUnique({
    where: { id: columnId },
    select: { board: { select: { projectId: true } } },
  });
  if (!column) {
    throw new NotFoundError('Column not found');
  }
  return column.board.projectId;
}

export async function resolveProjectIdByCard(db: Db, cardId: string): Promise<string> {
  const card = await db.card.findUnique({
    where: { id: cardId },
    select: { column: { select: { board: { select: { projectId: true } } } } },
  });
  if (!card) {
    throw new NotFoundError('Card not found');
  }
  return card.column.board.projectId;
}
