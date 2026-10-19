import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@prisma/client';

export interface TokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
  type: 'access' | 'refresh';
}

export const signAccessToken = (payload: Omit<TokenPayload, 'type'>): string =>
  jwt.sign({ ...payload, type: 'access' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);

export const signRefreshToken = (payload: Omit<TokenPayload, 'type'>): string =>
  jwt.sign({ ...payload, type: 'refresh' }, env.jwtSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  } as SignOptions);

export const verifyToken = (token: string): TokenPayload => jwt.verify(token, env.jwtSecret) as TokenPayload;
