import { z } from 'zod';

export const UserSchema = z.object({
  steamId: z.string().regex(/^\d{17}$/),
  username: z.string().min(1),
  avatar: z.string().url(),
  profileUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
