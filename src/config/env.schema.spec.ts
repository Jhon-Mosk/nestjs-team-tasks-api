import { envSchema } from './env.schema';

describe('envSchema', () => {
  it('parses env and applies defaults', () => {
    const parsed = envSchema.parse({
      NODE_ENV: 'test',
      // PORT omitted -> default 3000
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'app',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_DB: 'mydb',
      // SHUTDOWN_TIMEOUT_MS omitted -> default 30000
      REDIS_USER: 'u',
      REDIS_USER_PASSWORD: 'p',
      REDIS_HOST: 'localhost',
      // REDIS_PORT omitted -> default 6379
      JWT_ACCESS_SECRET: 'a',
      JWT_REFRESH_SECRET: 'r',
      // TTL omitted -> defaults
      // TASKS_LIST_CACHE_TTL_SEC omitted -> default 300
    });

    expect(parsed.PORT).toBe(3000);
    expect(parsed.POSTGRES_PORT).toBe(5432);
    expect(parsed.SHUTDOWN_TIMEOUT_MS).toBe(30_000);
    expect(parsed.REDIS_PORT).toBe(6379);
    expect(parsed.JWT_ACCESS_TTL_SEC).toBe(900);
    expect(parsed.JWT_REFRESH_TTL_SEC).toBe(604800);
    expect(parsed.TASKS_LIST_CACHE_TTL_SEC).toBe(300);
  });

  it('throws on invalid NODE_ENV', () => {
    expect(() =>
      envSchema.parse({
        NODE_ENV: 'staging',
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'app',
        POSTGRES_PASSWORD: 'secret',
        POSTGRES_DB: 'mydb',
        REDIS_USER: 'u',
        REDIS_USER_PASSWORD: 'p',
        REDIS_HOST: 'localhost',
        JWT_ACCESS_SECRET: 'a',
        JWT_REFRESH_SECRET: 'r',
      }),
    ).toThrow();
  });
});
