import { Role, User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyToken, TokenPayload } from '../../utils/jwt';
import { LoginInput, RegisterInput } from './auth.schemas';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  createdAt: user.createdAt,
});

const buildTokens = (user: User): { accessToken: string; refreshToken: string } => {
  const base = { sub: user.id, email: user.email, role: user.role, name: user.name };
  return {
    accessToken: signAccessToken(base),
    refreshToken: signRefreshToken(base),
  };
};

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('User with this email already exists');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role ?? Role.DEVELOPER,
    },
  });
  return { user: toPublicUser(user), ...buildTokens(user) };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }
  return { user: toPublicUser(user), ...buildTokens(user) };
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  let payload: TokenPayload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
  if (payload.type !== 'refresh') {
    throw new UnauthorizedError('Invalid token type');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return { user: toPublicUser(user), ...buildTokens(user) };
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return toPublicUser(user);
}
