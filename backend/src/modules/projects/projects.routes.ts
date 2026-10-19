import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './projects.controller';
import {
  addMemberSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  updateMemberSchema,
  updateProjectSchema,
} from './projects.schemas';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List projects accessible to the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 *   post:
 *     tags: [Projects]
 *     summary: Create a project (ADMIN or MANAGER)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.get('/', validate(listProjectsQuerySchema, 'query'), controller.list);
router.post('/', authorize(Role.ADMIN, Role.MANAGER), validate(createProjectSchema), controller.create);

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get a project by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Projects]
 *     summary: Update a project
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 *   delete:
 *     tags: [Projects]
 *     summary: Delete a project
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 */
router.get('/:id', controller.getOne);
router.patch('/:id', validate(updateProjectSchema), controller.update);
router.delete('/:id', controller.remove);

/**
 * @openapi
 * /api/projects/{id}/members:
 *   get:
 *     tags: [Projects]
 *     summary: List project members
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 *   post:
 *     tags: [Projects]
 *     summary: Add a member to the project
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.get('/:id/members', controller.listMembers);
router.post('/:id/members', validate(addMemberSchema), controller.addMember);
router.patch('/:id/members/:memberId', validate(updateMemberSchema), controller.updateMember);
router.delete('/:id/members/:memberId', controller.removeMember);

export default router;
