import { ActivityAction, PrismaClient } from '@prisma/client';

export interface LogActivityInput {
  action: ActivityAction;
  entity: string;
  entityId: string;
  userId: string;
  projectId?: string | null;
  cardId?: string | null;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

const stringify = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
};

export async function logActivity(db: PrismaClient, input: LogActivityInput): Promise<void> {
  await db.activityLog.create({
    data: {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      userId: input.userId,
      projectId: input.projectId ?? null,
      cardId: input.cardId ?? null,
      field: input.field ?? null,
      oldValue: stringify(input.oldValue),
      newValue: stringify(input.newValue),
    },
  });
}
