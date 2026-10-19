import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { UnauthorizedError } from '../../utils/errors';
import { param } from '../../utils/params';
import * as service from './boards.service';

const requireUser = (req: Request) => {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
};

export const create = asyncHandler(async (req: Request, res: Response) => {
  const board = await service.createBoard(requireUser(req), param(req, 'projectId'), req.body);
  res.status(201).json({ board });
});

export const listByProject = asyncHandler(async (req: Request, res: Response) => {
  const boards = await service.listBoards(requireUser(req), param(req, 'projectId'));
  res.status(200).json({ boards });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const board = await service.getBoard(requireUser(req), param(req, 'id'));
  res.status(200).json({ board });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const board = await service.updateBoard(requireUser(req), param(req, 'id'), req.body);
  res.status(200).json({ board });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.deleteBoard(requireUser(req), param(req, 'id'));
  res.status(200).json(result);
});

export const createColumn = asyncHandler(async (req: Request, res: Response) => {
  const column = await service.createColumn(requireUser(req), param(req, 'id'), req.body);
  res.status(201).json({ column });
});

export const updateColumn = asyncHandler(async (req: Request, res: Response) => {
  const column = await service.updateColumn(requireUser(req), param(req, 'columnId'), req.body);
  res.status(200).json({ column });
});

export const removeColumn = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.deleteColumn(requireUser(req), param(req, 'columnId'));
  res.status(200).json(result);
});

export const reorderColumns = asyncHandler(async (req: Request, res: Response) => {
  const columns = await service.reorderColumns(requireUser(req), param(req, 'id'), req.body);
  res.status(200).json({ columns });
});
