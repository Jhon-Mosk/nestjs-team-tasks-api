import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),

  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.coerce.number(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),

  SHUTDOWN_TIMEOUT_MS: z.coerce.number().default(30_000),

  REDIS_USER: z.string(),
  REDIS_USER_PASSWORD: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number().default(6379),

  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_TTL_SEC: z.number().default(900),
  JWT_REFRESH_TTL_SEC: z.number().default(604800),
});

export type EnvSchema = z.infer<typeof envSchema>;
