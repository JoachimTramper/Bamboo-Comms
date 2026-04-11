import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthJwtPayload, AuthPrincipal } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }
  async validate(payload: AuthJwtPayload): Promise<AuthPrincipal> {
    const subjectType = payload.subjectType ?? 'user';

    if (subjectType === 'customer') {
      return {
        sub: payload.sub,
        email: payload.email ?? null,
        subjectType,
      };
    }

    return {
      sub: payload.sub,
      email: payload.email ?? '',
      subjectType: 'user',
    };
  }
}
