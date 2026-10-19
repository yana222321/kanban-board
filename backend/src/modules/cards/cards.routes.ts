import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import * as controller from './cards.controller';
import {
  commentSchema,
  createCardSchema,
  labelSchema,
  listCardsQuerySchema,
  moveCardSchema,
  updateCardSchema,
  updateLabelSchema,
} from './cards.schemas';

export const cardsRouter = Router();

cardsRouter.post(
  '/columns/:columnId/cards',
  authenticate,
  validate(createCardSchema),
  controller.create,
);
cardsRouter.get(
  '/boards/:boardId/cards',
  authenticate,
  validate(listCardsQuerySchema, 'query'),
  controller.listByBoard,
);

cardsRouter.get('/cards/:cardId', authenticate, controller.getOne);
cardsRouter.patch('/cards/:cardId', authenticate, validate(updateCardSchema), controller.update);
cardsRouter.delete('/cards/:cardId', authenticate, controller.remove);
cardsRouter.patch('/cards/:cardId/move', authenticate, validate(moveCardSchema), controller.move);
cardsRouter.get('/cards/:cardId/history', authenticate, controller.history);

cardsRouter.get('/cards/:cardId/comments', authenticate, controller.listComments);
cardsRouter.post('/cards/:cardId/comments', authenticate, validate(commentSchema), controller.addComment);
cardsRouter.delete('/comments/:commentId', authenticate, controller.removeComment);

cardsRouter.get('/cards/:cardId/attachments', authenticate, controller.listAttachments);
cardsRouter.post(
  '/cards/:cardId/attachments',
  authenticate,
  upload.single('file'),
  controller.addAttachment,
);
cardsRouter.delete('/attachments/:attachmentId', authenticate, controller.removeAttachment);

export const labelsRouter = Router({ mergeParams: true });
labelsRouter.use(authenticate);
labelsRouter.get('/', controller.listLabels);
labelsRouter.post('/', validate(labelSchema), controller.createLabel);
labelsRouter.patch('/:labelId', validate(updateLabelSchema), controller.updateLabel);
labelsRouter.delete('/:labelId', controller.removeLabel);
