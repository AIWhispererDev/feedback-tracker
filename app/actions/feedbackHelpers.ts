import { z } from 'zod';

export const feedbackSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.enum(['general','bug','feature','improvement']),
});

export const rateLimitMap = new Map<string, { count: number; firstTimestamp: number }>();
