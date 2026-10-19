import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import projectsRoutes from './modules/projects/projects.routes';
import { boardsRouter, columnsRouter, projectBoardsRouter } from './modules/boards/boards.routes';
import { cardsRouter, labelsRouter } from './modules/cards/cards.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

router.use('/projects/:projectId/boards', projectBoardsRouter);
router.use('/projects/:projectId/labels', labelsRouter);
router.use('/projects', projectsRoutes);

router.use('/boards', boardsRouter);
router.use('/columns', columnsRouter);
router.use('/', cardsRouter);

export default router;
