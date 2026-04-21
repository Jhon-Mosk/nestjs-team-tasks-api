import configuration from './confuguration';

describe('configuration()', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('maps parsed env into config object', () => {
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '3001';
    process.env['POSTGRES_HOST'] = 'db';
    process.env['POSTGRES_PORT'] = '5432';
    process.env['POSTGRES_USER'] = 'app';
    process.env['POSTGRES_PASSWORD'] = 'secret';
    process.env['POSTGRES_DB'] = 'mydb';
    process.env['SHUTDOWN_TIMEOUT_MS'] = '1234';
    process.env['REDIS_USER'] = 'u';
    process.env['REDIS_USER_PASSWORD'] = 'p';
    process.env['REDIS_HOST'] = 'redis';
    process.env['REDIS_PORT'] = '6379';
    process.env['JWT_ACCESS_SECRET'] = 'a';
    process.env['JWT_REFRESH_SECRET'] = 'r';
    process.env['JWT_ACCESS_TTL_SEC'] = '900';
    process.env['JWT_REFRESH_TTL_SEC'] = '604800';
    process.env['TASKS_LIST_CACHE_TTL_SEC'] = '300';

    const cfg = configuration();

    expect(cfg.nodeEnv).toBe('test');
    expect(cfg.port).toBe(3001);
    expect(cfg.database.host).toBe('db');
    expect(cfg.redis.host).toBe('redis');
    expect(cfg.jwt.accessSecret).toBe('a');
    expect(cfg.shutdownTimeoutMs).toBe(1234);
    expect(cfg.tasksListCacheTtlSec).toBe(300);
  });
});
