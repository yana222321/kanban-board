import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';
import { param } from '../../utils/params';
import * as service from './cards.service';

const requireUser = (req: Request) => {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
};

export const create = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.createCard(requireUser(req), param(req, 'columnId'), req.body);
  res.status(201).json({ card });
});

export const listByBoard = asyncHandler(async (req: Request, res: Response) => {
  const cards = await service.listCardsByBoard(requireUser(req), param(req, 'boardId'), req.query);
  res.status(200).json({ cards });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.getCard(requireUser(req), param(req, 'cardId'));
  res.status(200).json({ card });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.updateCard(requireUser(req), param(req, 'cardId'), req.body);
  res.status(200).json({ card });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.deleteCard(requireUser(req), param(req, 'cardId'));
  res.status(200).json(result);
});

export const move = asyncHandler(async (req: Request, res: Response) => {
  const card = await service.moveCard(requireUser(req), param(req, 'cardId'), req.body);
  res.status(200).json({ card });
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  const entries = await service.getHistory(requireUser(req), param(req, 'cardId'));
  res.status(200).json({ history: entries });
});

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await service.listComments(requireUser(req), param(req, 'cardId'));
  res.status(200).json({ comments });
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await service.addComment(requireUser(req), param(req, 'cardId'), req.body);
  res.status(201).json({ comment });
});

export const removeComment = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.deleteComment(requireUser(req), param(req, 'commentId'));
  res.status(200).json(result);
});

export const listAttachments = asyncHandler(async (req: Request, res: Response) => {
  const attachments = await service.listAttachments(requireUser(req), param(req, 'cardId'));
  res.status(200).json({ attachments });
});

export const addAttachment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError('File is required');
  }
  const attachment = await service.addAttachment(requireUser(req), param(req, 'cardId'), {
    filename: req.file.originalname,
    path: req.file.path,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
  res.status(201).json({ attachment });
});

export const removeAttachment = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.deleteAttachment(requireUser(req), param(req, 'attachmentId'));
  res.status(200).json({ id: result.id });
});

export const listLabels = asyncHandler(async (req: Request, res: Response) => {
  const labels = await service.listLabels(requireUser(req), param(req, 'projectId'));
  res.status(200).json({ labels });
});

export const createLabel = asyncHandler(async (req: Request, res: Response) => {
  const label = await service.createLabel(requireUser(req), param(req, 'projectId'), req.body);
  res.status(201).json({ label });
});

export const updateLabel = asyncHandler(async (req: Request, res: Response) => {
  const label = await service.updateLabel(
    requireUser(req),
    param(req, 'projectId'),
    param(req, 'labelId'),
    req.body,
  );
  res.status(200).json({ label });
});

export const removeLabel = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.deleteLabel(requireUser(req), param(req, 'projectId'), param(req, 'labelId'));
  res.status(200).json(result);
});
