import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import {
  type JwtFromRequestFunction,
  Strategy,
  type StrategyOptions,
} from 'passport-jwt';
import { Configuration } from 'src/config/confuguration';
import { AccessTokenPayload } from '../types/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<Configuration, true>) {
    const jwt = configService.getOrThrow('jwt', { infer: true });
    const jwtFromRequest: JwtFromRequestFunction<Request> = (req) => {
      const authHeader = req.headers.authorization;
      if (typeof authHeader !== 'string') return null;

      const [scheme, token] = authHeader.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

      return token;
    };

    const options: StrategyOptions = {
      jwtFromRequest,
      secretOrKey: jwt.accessSecret,
      ignoreExpiration: false,
    };

    super(options);
  }

  validate(payload: AccessTokenPayload) {
    return payload;
  }
}
