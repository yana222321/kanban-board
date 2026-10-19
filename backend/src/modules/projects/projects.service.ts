import { MemberRole, Project, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AuthUser } from '../../middleware/auth';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { logActivity } from '../../services/activity';
import {
  assertCanDeleteProject,
  assertCanManageProject,
  getProjectAccess,
} from '../../services/permissions';
import { AddMemberInput, CreateProjectInput, UpdateMemberInput, UpdateProjectInput } from './projects.schemas';

const DEFAULT_COLUMNS = [
  { name: 'To Do', position: 0, wipLimit: null as number | null },
  { name: 'In Progress', position: 1, wipLimit: 3 as number | null },
  { name: 'Done', position: 2, wipLimit: null as number | null },
];

export async function createProject(user: AuthUser, input: CreateProjectInput) {
  const existing = await prisma.project.findUnique({ where: { key: input.key } });
  if (existing) {
    throw new ConflictError('Project with this key already exists');
  }

  const project = await prisma.project.create({
    data: {
      name: input.name,
      key: input.key,
      description: input.description ?? null,
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: MemberRole.MANAGER },
      },
      boards: {
        create: {
          name: 'Main Board',
          columns: { create: DEFAULT_COLUMNS },
        },
      },
      labels: {
        create: [
          { name: 'bug', color: '#ef4444' },
          { name: 'feature', color: '#22c55e' },
          { name: 'task', color: '#3b82f6' },
        ],
      },
    },
    include: { boards: { include: { columns: true } }, members: true },
  });

  await logActivity(prisma, {
    action: 'CREATE',
    entity: 'Project',
    entityId: project.id,
    userId: user.id,
    projectId: project.id,
    newValue: { name: project.name, key: project.key },
  });

  return project;
}

export async function listProjects(user: AuthUser, search?: string) {
  const where =
    user.role === Role.ADMIN
      ? {}
      : { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] };

  return prisma.project.findMany({
    where: search
      ? { AND: [where, { OR: [{ name: { contains: search, mode: 'insensitive' } }, { key: { contains: search, mode: 'insensitive' } }] }] }
      : where,
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { boards: true, members: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProject(user: AuthUser, projectId: string) {
  await getProjectAccess(prisma, user, projectId);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      boards: { include: { columns: { orderBy: { position: 'asc' } } }, orderBy: { createdAt: 'asc' } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  return project;
}

export async function updateProject(user: AuthUser, projectId: string, input: UpdateProjectInput) {
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });

  await logActivity(prisma, {
    action: 'UPDATE',
    entity: 'Project',
    entityId: projectId,
    userId: user.id,
    projectId,
    newValue: input,
  });

  return updated;
}

export async function deleteProject(user: AuthUser, projectId: string) {
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanDeleteProject(access);

  await prisma.project.delete({ where: { id: projectId } });
  return { id: projectId };
}

export async function listMembers(user: AuthUser, projectId: string) {
  await getProjectAccess(prisma, user, projectId);
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addMember(user: AuthUser, projectId: string, input: AddMemberInput) {
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  const target = await prisma.user.findUnique({ where: { email: input.email } });
  if (!target) {
    throw new NotFoundError('User with this email not found');
  }
  if (target.id === access.project.ownerId) {
    throw new BadRequestError('Owner is already a member');
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: target.id } },
    update: { role: input.role },
    create: { projectId, userId: target.id, role: input.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await logActivity(prisma, {
    action: 'CREATE',
    entity: 'ProjectMember',
    entityId: member.id,
    userId: user.id,
    projectId,
    newValue: { userId: target.id, role: input.role },
  });

  return member;
}

export async function updateMember(
  user: AuthUser,
  projectId: string,
  memberId: string,
  input: UpdateMemberInput,
) {
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  const member = await prisma.projectMember.findUnique({ where: { id: memberId } });
  if (!member || member.projectId !== projectId) {
    throw new NotFoundError('Member not found');
  }

  return prisma.projectMember.update({ where: { id: memberId }, data: { role: input.role } });
}

export async function removeMember(user: AuthUser, projectId: string, memberId: string) {
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanManageProject(access);

  const member = await prisma.projectMember.findUnique({ where: { id: memberId } });
  if (!member || member.projectId !== projectId) {
    throw new NotFoundError('Member not found');
  }
  if (member.userId === access.project.ownerId) {
    throw new BadRequestError('Cannot remove the project owner');
  }

  await prisma.projectMember.delete({ where: { id: memberId } });
  return { id: memberId };
}

export type ProjectWithRelations = Project;
