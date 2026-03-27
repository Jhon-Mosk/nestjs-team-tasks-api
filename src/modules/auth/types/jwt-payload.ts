import { UserRole } from 'src/modules/users/users.entity';

export type AccessTokenPayload = {
  sub: string; // userId
  organizationId: string;
  role: UserRole;
};

export type RefreshTokenPayload = {
  sub: string; // userId
  tid: string; // token id
};
