import { envSchema } from './env.schema';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

export interface RedisConfig {
  user: string;
  userPassword: string;
  host: string;
  port: number;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSec: number;
  refreshTtlSec: number;
}

export interface Configuration {
  nodeEnv: string;
  port: number;
  database: DatabaseConfig;
  shutdownTimeoutMs: number;
  redis: RedisConfig;
  jwt: JwtConfig;
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
    jwt: {
      accessSecret: parsed.JWT_ACCESS_SECRET,
      refreshSecret: parsed.JWT_REFRESH_SECRET,
      accessTtlSec: parsed.JWT_ACCESS_TTL_SEC,
      refreshTtlSec: parsed.JWT_REFRESH_TTL_SEC,
    },
  };
};
