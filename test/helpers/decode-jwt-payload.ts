import { AccessTokenPayload } from '../../src/modules/auth/types/jwt-payload';

export function decodeAccessTokenPayload(token: string): AccessTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) {
    throw new Error('Invalid JWT');
  }
  const json = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(json) as AccessTokenPayload;
}
