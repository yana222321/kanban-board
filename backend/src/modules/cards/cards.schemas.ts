import { z } from 'zod';

const priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createCardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(10000).optional(),
  priority: priority.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export const updateCardSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(10000).nullable().optional(),
    priority: priority.optional(),
    dueDate: z.coerce.date().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    labelIds: z.array(z.string().uuid()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const moveCardSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number().int().min(0),
});

export const listCardsQuerySchema = z.object({
  search: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: priority.optional(),
  labelId: z.string().uuid().optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
});

export const commentSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const labelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Color must be a hex value like #3b82f6')
    .default('#3b82f6'),
});

export const updateLabelSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type LabelInput = z.infer<typeof labelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
