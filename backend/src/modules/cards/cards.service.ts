import { ActivityAction, Attachment, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AuthUser } from '../../middleware/auth';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { logActivity } from '../../services/activity';
import {
  assertCanContribute,
  canManageProject,
  getProjectAccess,
  resolveProjectIdByBoard,
  resolveProjectIdByCard,
  resolveProjectIdByColumn,
} from '../../services/permissions';
import {
  CommentInput,
  CreateCardInput,
  LabelInput,
  ListCardsQuery,
  MoveCardInput,
  UpdateCardInput,
  UpdateLabelInput,
} from './cards.schemas';

async function ensureAssigneeIsMember(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (project?.ownerId === userId) return;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) {
    throw new BadRequestError('Assignee must be a member of the project');
  }
}

async function ensureLabelsBelongToProject(projectId: string, labelIds: string[]): Promise<void> {
  if (labelIds.length === 0) return;
  const count = await prisma.label.count({ where: { id: { in: labelIds }, projectId } });
  if (count !== labelIds.length) {
    throw new BadRequestError('One or more labels do not belong to this project');
  }
}

export async function createCard(user: AuthUser, columnId: string, input: CreateCardInput) {
  const projectId = await resolveProjectIdByColumn(prisma, columnId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanContribute(access);

  if (input.assigneeId) {
    await ensureAssigneeIsMember(projectId, input.assigneeId);
  }
  if (input.labelIds) {
    await ensureLabelsBelongToProject(projectId, input.labelIds);
  }

  const position = await prisma.card.count({ where: { columnId } });

  const card = await prisma.card.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'MEDIUM',
      dueDate: input.dueDate ?? null,
      assigneeId: input.assigneeId ?? null,
      columnId,
      createdById: user.id,
      position,
      labels: input.labelIds ? { connect: input.labelIds.map((id) => ({ id })) } : undefined,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      labels: true,
    },
  });

  await logActivity(prisma, {
    action: ActivityAction.CREATE,
    entity: 'Card',
    entityId: card.id,
    userId: user.id,
    projectId,
    cardId: card.id,
    newValue: { title: card.title, columnId },
  });
  if (card.assigneeId) {
    await logActivity(prisma, {
      action: ActivityAction.ASSIGN,
      entity: 'Card',
      entityId: card.id,
      userId: user.id,
      projectId,
      cardId: card.id,
      field: 'assigneeId',
      newValue: card.assigneeId,
    });
  }

  return card;
}

export async function listCardsByBoard(user: AuthUser, boardId: string, filters: ListCardsQuery) {
  const projectId = await resolveProjectIdByBoard(prisma, boardId);
  await getProjectAccess(prisma, user, projectId);

  const where: Prisma.CardWhereInput = { column: { boardId } };
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.priority) where.priority = filters.priority;
  if (filters.labelId) where.labels = { some: { id: filters.labelId } };
  if (filters.dueAfter || filters.dueBefore) {
    where.dueDate = {
      ...(filters.dueAfter ? { gte: filters.dueAfter } : {}),
      ...(filters.dueBefore ? { lte: filters.dueBefore } : {}),
    };
  }

  return prisma.card.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      labels: true,
      _count: { select: { comments: true, attachments: true } },
    },
    orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
  });
}

export async function getCard(user: AuthUser, cardId: string) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  await getProjectAccess(prisma, user, projectId);

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      labels: true,
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: true,
    },
  });
  if (!card) {
    throw new NotFoundError('Card not found');
  }
  return card;
}

export async function updateCard(user: AuthUser, cardId: string, input: UpdateCardInput) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanContribute(access);

  const existing = await prisma.card.findUnique({ where: { id: cardId } });
  if (!existing) {
    throw new NotFoundError('Card not found');
  }

  if (input.assigneeId) {
    await ensureAssigneeIsMember(projectId, input.assigneeId);
  }
  if (input.labelIds) {
    await ensureLabelsBelongToProject(projectId, input.labelIds);
  }

  const data: Prisma.CardUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.assigneeId !== undefined) {
    data.assignee = input.assigneeId ? { connect: { id: input.assigneeId } } : { disconnect: true };
  }
  if (input.labelIds !== undefined) {
    data.labels = { set: input.labelIds.map((id) => ({ id })) };
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data,
    include: { assignee: { select: { id: true, name: true, email: true } }, labels: true },
  });

  await logActivity(prisma, {
    action: ActivityAction.UPDATE,
    entity: 'Card',
    entityId: cardId,
    userId: user.id,
    projectId,
    cardId,
    newValue: input,
  });
  if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
    await logActivity(prisma, {
      action: ActivityAction.ASSIGN,
      entity: 'Card',
      entityId: cardId,
      userId: user.id,
      projectId,
      cardId,
      field: 'assigneeId',
      oldValue: existing.assigneeId,
      newValue: updated.assigneeId,
    });
  }

  return updated;
}

export async function deleteCard(user: AuthUser, cardId: string) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanContribute(access);

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    throw new NotFoundError('Card not found');
  }

  await prisma.card.delete({ where: { id: cardId } });
  await logActivity(prisma, {
    action: ActivityAction.DELETE,
    entity: 'Card',
    entityId: cardId,
    userId: user.id,
    projectId,
    oldValue: { title: card.title },
  });
  return { id: cardId };
}

export async function moveCard(user: AuthUser, cardId: string, input: MoveCardInput) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanContribute(access);

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) {
    throw new NotFoundError('Card not found');
  }

  const targetColumn = await prisma.column.findUnique({ where: { id: input.columnId } });
  if (!targetColumn) {
    throw new NotFoundError('Target column not found');
  }
  if (targetColumn.boardId !== card.column.boardId) {
    throw new BadRequestError('Cannot move a card to a column on another board');
  }

  const movingWithinSameColumn = card.columnId === targetColumn.id;
  if (!movingWithinSameColumn && targetColumn.wipLimit !== null) {
    const currentCount = await prisma.card.count({ where: { columnId: targetColumn.id } });
    if (currentCount >= targetColumn.wipLimit) {
      throw new ConflictError(
        `WIP limit reached for column "${targetColumn.name}" (${targetColumn.wipLimit}). Move is blocked.`,
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    const siblings = await tx.card.findMany({
      where: { columnId: targetColumn.id, id: { not: cardId } },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const orderedIds = siblings.map((c) => c.id);
    const insertAt = Math.min(Math.max(input.position, 0), orderedIds.length);
    orderedIds.splice(insertAt, 0, cardId);

    await tx.card.update({ where: { id: cardId }, data: { columnId: targetColumn.id } });
    await Promise.all(
      orderedIds.map((id, index) =>
        tx.card.update({ where: { id }, data: { position: index } }),
      ),
    );
  });

  if (!movingWithinSameColumn) {
    await logActivity(prisma, {
      action: ActivityAction.MOVE,
      entity: 'Card',
      entityId: cardId,
      userId: user.id,
      projectId,
      cardId,
      field: 'columnId',
      oldValue: card.columnId,
      newValue: targetColumn.id,
    });
  }

  return getCard(user, cardId);
}

export async function getHistory(user: AuthUser, cardId: string) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  await getProjectAccess(prisma, user, projectId);

  return prisma.activityLog.findMany({
    where: { cardId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listComments(user: AuthUser, cardId: string) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  await getProjectAccess(prisma, user, projectId);

  return prisma.comment.findMany({
    where: { cardId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addComment(user: AuthUser, cardId: string, input: CommentInput) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanContribute(access);

  const comment = await prisma.comment.create({
    data: { body: input.body, cardId, authorId: user.id },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  await logActivity(prisma, {
    action: ActivityAction.COMMENT,
    entity: 'Comment',
    entityId: comment.id,
    userId: user.id,
    projectId,
    cardId,
    newValue: { body: input.body },
  });

  return comment;
}

export async function deleteComment(user: AuthUser, commentId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw new NotFoundError('Comment not found');
  }
  const projectId = await resolveProjectIdByCard(prisma, comment.cardId);
  const access = await getProjectAccess(prisma, user, projectId);

  const isAuthor = comment.authorId === user.id;
  if (!isAuthor && !canManageProject(access.level)) {
    throw new ForbiddenError('You can only delete your own comments');
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return { id: commentId };
}

export async function listAttachments(user: AuthUser, cardId: string) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  await getProjectAccess(prisma, user, projectId);
  return prisma.attachment.findMany({ where: { cardId }, orderBy: { createdAt: 'desc' } });
}

export async function addAttachment(
  user: AuthUser,
  cardId: string,
  file: { filename: string; path: string; mimetype: string; size: number },
) {
  const projectId = await resolveProjectIdByCard(prisma, cardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanContribute(access);

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.filename,
      storedPath: file.path,
      mimetype: file.mimetype,
      size: file.size,
      cardId,
      uploadedById: user.id,
    },
  });

  await logActivity(prisma, {
    action: ActivityAction.ATTACH,
    entity: 'Attachment',
    entityId: attachment.id,
    userId: user.id,
    projectId,
    cardId,
    newValue: { filename: file.filename },
  });

  return attachment;
}

export async function deleteAttachment(user: AuthUser, attachmentId: string): Promise<Attachment> {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) {
    throw new NotFoundError('Attachment not found');
  }
  const projectId = await resolveProjectIdByCard(prisma, attachment.cardId);
  const access = await getProjectAccess(prisma, user, projectId);
  assertCanContribute(access);

  await prisma.attachment.delete({ where: { id: attachmentId } });
  return attachment;
}

// ----- Labels -----

export async function listLabels(user: AuthUser, projectId: string) {
  await getProjectAccess(prisma, user, projectId);
  return prisma.label.findMany({ where: { projectId }, orderBy: { name: 'asc' } });
}

export async function createLabel(user: AuthUser, projectId: string, input: LabelInput) {
  const access = await getProjectAccess(prisma, user, projectId);
  if (!canManageProject(access.level)) {
    throw new ForbiddenError('You cannot manage labels');
  }
  return prisma.label.create({ data: { name: input.name, color: input.color, projectId } });
}

export async function updateLabel(
  user: AuthUser,
  projectId: string,
  labelId: string,
  input: UpdateLabelInput,
) {
  const access = await getProjectAccess(prisma, user, projectId);
  if (!canManageProject(access.level)) {
    throw new ForbiddenError('You cannot manage labels');
  }
  const label = await prisma.label.findUnique({ where: { id: labelId } });
  if (!label || label.projectId !== projectId) {
    throw new NotFoundError('Label not found');
  }
  return prisma.label.update({ where: { id: labelId }, data: input });
}

export async function deleteLabel(user: AuthUser, projectId: string, labelId: string) {
  const access = await getProjectAccess(prisma, user, projectId);
  if (!canManageProject(access.level)) {
    throw new ForbiddenError('You cannot manage labels');
  }
  const label = await prisma.label.findUnique({ where: { id: labelId } });
  if (!label || label.projectId !== projectId) {
    throw new NotFoundError('Label not found');
  }
  await prisma.label.delete({ where: { id: labelId } });
  return { id: labelId };
}
