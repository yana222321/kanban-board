import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z][A-Z0-9]*$/, 'Key must be uppercase letters and digits, starting with a letter'),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MANAGER', 'DEVELOPER', 'VIEWER']).default('DEVELOPER'),
});

export const updateMemberSchema = z.object({
  role: z.enum(['MANAGER', 'DEVELOPER', 'VIEWER']),
});

export const listProjectsQuerySchema = z.object({
  search: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
