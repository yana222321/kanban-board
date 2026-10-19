import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { param } from '../../utils/params';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users (for assignment pickers)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
    res.json({ users });
  }),
);

/**
 * @openapi
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change a user's global role (ADMIN only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 */
router.patch(
  '/:id/role',
  authorize(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: param(req, 'id') },
      data: { role: req.body.role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ user });
  }),
);

export default router;
