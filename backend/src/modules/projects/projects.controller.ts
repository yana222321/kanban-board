import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { UnauthorizedError } from '../../utils/errors';
import { param } from '../../utils/params';
import * as service from './projects.service';

const requireUser = (req: Request) => {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
};

export const create = asyncHandler(async (req: Request, res: Response) => {
  const project = await service.createProject(requireUser(req), req.body);
  res.status(201).json({ project });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const projects = await service.listProjects(requireUser(req), search);
  res.status(200).json({ projects });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const project = await service.getProject(requireUser(req), param(req, 'id'));
  res.status(200).json({ project });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const project = await service.updateProject(requireUser(req), param(req, 'id'), req.body);
  res.status(200).json({ project });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.deleteProject(requireUser(req), param(req, 'id'));
  res.status(200).json(result);
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await service.listMembers(requireUser(req), param(req, 'id'));
  res.status(200).json({ members });
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await service.addMember(requireUser(req), param(req, 'id'), req.body);
  res.status(201).json({ member });
});

export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await service.updateMember(requireUser(req), param(req, 'id'), param(req, 'memberId'), req.body);
  res.status(200).json({ member });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.removeMember(requireUser(req), param(req, 'id'), param(req, 'memberId'));
  res.status(200).json(result);
});
