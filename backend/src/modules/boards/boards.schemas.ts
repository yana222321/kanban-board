import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z.string().min(1).max(120),
});

export const updateBoardSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const createColumnSchema = z.object({
  name: z.string().min(1).max(120),
  wipLimit: z.number().int().positive().max(1000).nullable().optional(),
});

export const updateColumnSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    wipLimit: z.number().int().positive().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string().uuid()).min(1),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;
