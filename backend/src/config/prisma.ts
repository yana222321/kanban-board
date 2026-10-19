import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient({
  log: env.isTest ? [] : ['warn', 'error'],
});

export type Db = typeof prisma;
