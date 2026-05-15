import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(120, 'Too long'),
  operator: z.string().trim().max(120, 'Too long').optional()
});

