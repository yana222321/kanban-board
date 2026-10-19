import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './boards.controller';
import {
  createBoardSchema,
  createColumnSchema,
  reorderColumnsSchema,
  updateBoardSchema,
  updateColumnSchema,
} from './boards.schemas';

// Router mounted at /api/boards
export const boardsRouter = Router();
boardsRouter.use(authenticate);

boardsRouter.get('/:id', controller.getOne);
boardsRouter.patch('/:id', validate(updateBoardSchema), controller.update);
boardsRouter.delete('/:id', controller.remove);

boardsRouter.post('/:id/columns', validate(createColumnSchema), controller.createColumn);
boardsRouter.patch('/:id/columns/reorder', validate(reorderColumnsSchema), controller.reorderColumns);

// Router mounted at /api/projects/:projectId/boards
export const projectBoardsRouter = Router({ mergeParams: true });
projectBoardsRouter.use(authenticate);
projectBoardsRouter.get('/', controller.listByProject);
projectBoardsRouter.post('/', validate(createBoardSchema), controller.create);

// Router mounted at /api/columns
export const columnsRouter = Router();
columnsRouter.use(authenticate);
columnsRouter.patch('/:columnId', validate(updateColumnSchema), controller.updateColumn);
columnsRouter.delete('/:columnId', controller.removeColumn);
