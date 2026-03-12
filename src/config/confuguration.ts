import { envSchema } from './env.schema';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

export default () => {
  const parsed = envSchema.parse(process.env);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    database: {
      host: parsed.POSTGRES_HOST,
      port: parsed.POSTGRES_PORT,
      user: parsed.POSTGRES_USER,
      password: parsed.POSTGRES_PASSWORD,
      name: parsed.POSTGRES_DB,
    },
    shutdownTimeoutMs: parsed.SHUTDOWN_TIMEOUT_MS,
    redis: {
      user: parsed.REDIS_USER,
      userPassword: parsed.REDIS_USER_PASSWORD,
      host: parsed.REDIS_HOST,
      port: parsed.REDIS_PORT,
    },
  };
};
