import { z } from 'zod';

const boolFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return value;

  const v = value.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'y') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'n') return false;

  return value;
}, z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),

  /**
   * Swagger UI (/docs) is enabled only if NODE_ENV !== 'production'
   * and SWAGGER_ENABLED=true and both SWAGGER_USER/SWAGGER_PASSWORD are set.
   */
  SWAGGER_ENABLED: boolFromEnv.default(false),
  SWAGGER_USER: z.string().optional(),
  SWAGGER_PASSWORD: z.string().optional(),

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
  JWT_ACCESS_TTL_SEC: z.coerce.number().default(900),
  JWT_REFRESH_TTL_SEC: z.coerce.number().default(604800),

  /** TTL кеша ответа `GET /tasks` (секунды). По умолчанию 5 минут. */
  TASKS_LIST_CACHE_TTL_SEC: z.coerce.number().default(300),
});

export type EnvSchema = z.infer<typeof envSchema>;
