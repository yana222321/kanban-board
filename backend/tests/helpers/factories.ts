import { MemberRole, Priority, Role, User } from '@prisma/client';
import { prisma } from '../../src/config/prisma';
import { hashPassword } from '../../src/utils/password';
import { signAccessToken } from '../../src/utils/jwt';

let counter = 0;

export interface CreateUserOptions {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
}

export async function createUser(options: CreateUserOptions = {}): Promise<User> {
  counter += 1;
  const email = options.email ?? `user${counter}-${Date.now()}@test.local`;
  return prisma.user.create({
    data: {
      email,
      name: options.name ?? `Test User ${counter}`,
      passwordHash: await hashPassword(options.password ?? 'Password123!'),
      role: options.role ?? Role.DEVELOPER,
    },
  });
}

export function tokenFor(user: User): string {
  return signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export function authHeader(user: User): { Authorization: string } {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}

export interface ProjectFixture {
  projectId: string;
  boardId: string;
  todoColumnId: string;
  inProgressColumnId: string;
  doneColumnId: string;
}

export async function createProjectFixture(
  owner: User,
  options: { memberIds?: string[]; wipLimit?: number | null } = {},
): Promise<ProjectFixture> {
  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      key: `T${Date.now().toString().slice(-6)}`,
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: MemberRole.MANAGER },
          ...(options.memberIds ?? []).map((userId) => ({ userId, role: MemberRole.DEVELOPER })),
        ],
      },
      boards: {
        create: {
          name: 'Main Board',
          columns: {
            create: [
              { name: 'To Do', position: 0 },
              { name: 'In Progress', position: 1, wipLimit: options.wipLimit ?? null },
              { name: 'Done', position: 2 },
            ],
          },
        },
      },
    },
    include: { boards: { include: { columns: { orderBy: { position: 'asc' } } } } },
  });

  const board = project.boards[0];
  const columns = board.columns;
  return {
    projectId: project.id,
    boardId: board.id,
    todoColumnId: columns[0].id,
    inProgressColumnId: columns[1].id,
    doneColumnId: columns[2].id,
  };
}

export async function createCardDirect(
  columnId: string,
  authorId: string,
  overrides: Partial<{ title: string; priority: Priority; position: number }> = {},
) {
  return prisma.card.create({
    data: {
      title: overrides.title ?? 'Card',
      columnId,
      createdById: authorId,
      priority: overrides.priority ?? Priority.MEDIUM,
      position: overrides.position ?? 0,
    },
  });
}
