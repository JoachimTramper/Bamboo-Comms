import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';

const DISPLAYNAME_MAX = 32;

function makeToken() {
  return randomBytes(32).toString('hex');
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  private parseInviteCodes(raw?: string) {
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private isValidInviteCode(code?: string) {
    if (!code) return false;
    const allowed = this.parseInviteCodes(process.env.INVITE_CODE);
    if (allowed.length === 0) return false;
    return allowed.includes(code.trim());
  }

  async register(
    email: string,
    password: string,
    displayName: string,
    inviteCode?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const dn = (displayName ?? '').trim();

    if (!dn) {
      throw new BadRequestException('Display name is required');
    }
    if (dn.length > DISPLAYNAME_MAX) {
      throw new BadRequestException(
        `Display name can be max ${DISPLAYNAME_MAX} characters`,
      );
    }

    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) throw new BadRequestException('Email already in use');

    const hash = await bcrypt.hash(password, 12);
    const bypassVerify = this.isValidInviteCode(inviteCode);

    try {
      // Invite-bypass: direct verified, no email
      if (bypassVerify) {
        const user = await this.users.create({
          email: normalizedEmail,
          passwordHash: hash,
          displayName: dn,
          emailVerifiedAt: new Date(),
        });

        await this.users.ensureGeneralMembership(user.id);

        return { ok: true, bypassedEmailVerification: true };
      }

      // Normal flow: create + send verify email
      const user = await this.users.create({
        email: normalizedEmail,
        passwordHash: hash,
        displayName: dn,
      });

      const token = makeToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24u

      await this.users.upsertEmailVerificationToken(
        user.id,
        tokenHash,
        expiresAt,
      );

      try {
        await this.mail.sendVerifyEmail(user.email, token);
      } catch {
        await this.users.deleteEmailVerificationToken(user.id);
        await this.users.deleteUser(user.id);
        throw new BadRequestException('Failed to send verification email');
      }

      return { ok: true };
    } catch (e: any) {
      // Unique constraint (email/displayName)
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const target = (e.meta as any)?.target as string[] | undefined;

        if (target?.includes('displayName')) {
          throw new BadRequestException('Username already taken');
        }
        if (target?.includes('email')) {
          throw new BadRequestException('Email already in use');
        }
      }

      // Value too long for column (e.g. VARCHAR(32)) fallback
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2000'
      ) {
        throw new BadRequestException(
          `Display name can be max ${DISPLAYNAME_MAX} characters`,
        );
      }

      throw e;
    }
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email not verified');
    }

    return this.issueTokens(user.id, user.email);
  }

  async verifyEmail(token: string) {
    if (!token) throw new BadRequestException('Missing token');

    const tokenHash = hashToken(token);

    const record = await this.users.findEmailVerificationByHash(tokenHash);
    if (!record) throw new BadRequestException('Invalid token');
    if (record.expiresAt < new Date())
      throw new BadRequestException('Token expired');

    if (record.user?.emailVerifiedAt) {
      await this.users.ensureGeneralMembership(record.userId);
      await this.users.deleteEmailVerificationToken(record.userId);
      return { ok: true };
    }

    await this.users.markEmailVerified(record.userId);
    await this.users.ensureGeneralMembership(record.userId);

    await this.users.deleteEmailVerificationToken(record.userId);

    return { ok: true };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.users.findById(payload.sub);
      if (!user) throw new UnauthorizedException('Invalid refresh token');

      if (!user.emailVerifiedAt) {
        throw new UnauthorizedException('Email not verified');
      }

      return this.issueTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private issueTokens(sub: string, email: string) {
    const accessToken = this.jwt.sign(
      { sub, email },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );
    const refreshToken = this.jwt.sign(
      { sub, email },
      { expiresIn: '7d', secret: process.env.JWT_SECRET },
    );
    return { accessToken, refreshToken };
  }
}
