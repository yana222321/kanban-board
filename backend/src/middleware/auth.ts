import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }
    const payload: TokenPayload = verifyToken(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return next(err);
    }
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient role permissions'));
    }
    next();
  };
