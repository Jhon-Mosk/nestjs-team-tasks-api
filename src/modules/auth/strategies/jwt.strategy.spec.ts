import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('constructs and validates payload', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue({
        accessSecret: 'access',
        refreshSecret: 'refresh',
        accessTtlSec: 900,
        refreshTtlSec: 604800,
      }),
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(configService as never);

    expect(
      strategy.validate({
        sub: 'u1',
        organizationId: 'o1',
        role: 'owner',
      } as never),
    ).toEqual({ sub: 'u1', organizationId: 'o1', role: 'owner' });
  });
});
