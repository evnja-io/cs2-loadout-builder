import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  STEAM_API_KEY: z.string().min(1),
  API_URL: z.string().url(),
  WEB_URL: z.string().url(),
});

export const env = EnvSchema.parse(process.env);
