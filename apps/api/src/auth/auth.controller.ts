// apps/api/src/auth/auth.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UpdateDisplayNameDto } from './dto/display-name.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from './decorators/user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { mkdirSync } from 'fs';
import { UPLOADS_DIR } from '../uploads/uploads.constants';

const AVATAR_DEST = join(UPLOADS_DIR, 'avatars');
mkdirSync(AVATAR_DEST, { recursive: true });

const AVATAR_ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const REFRESH_COOKIE = 'refreshToken';

function getCookieOptions(req: Request) {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  @Throttle({ default: { limit: 4, ttl: 60 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const out: any = await this.auth.register(
      dto.email,
      dto.password,
      dto.displayName,
      dto.inviteCode,
    );

    if (out?.refreshToken) {
      res.cookie(REFRESH_COOKIE, out.refreshToken, getCookieOptions(req));
      delete out.refreshToken;
    }

    return out;
  }

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.login(
      dto.email,
      dto.password,
    );

    res.cookie(REFRESH_COOKIE, refreshToken, getCookieOptions(req));

    return { accessToken };
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('google')
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const out = await this.auth.googleLogin(dto.credential);

    res.cookie(REFRESH_COOKIE, out.refreshToken, getCookieOptions(req));
    return { accessToken: out.accessToken, needsUsername: out.needsUsername };
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new BadRequestException('Missing refresh cookie');

    const { accessToken, refreshToken } = await this.auth.refresh(token);

    res.cookie(REFRESH_COOKIE, refreshToken, getCookieOptions(req));

    return { accessToken };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      ...getCookieOptions(req),
      maxAge: 0,
    });
    return { ok: true };
  }

  @Throttle({ default: { limit: 20, ttl: 60 } })
  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.auth.verifyEmail(token);
  }

  @SkipThrottle()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@User() user: any) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        emailVerifiedAt: true,
        role: true,
      },
    });

    if (dbUser?.id) {
      const general = await this.prisma.channel.findFirst({
        where: { name: 'general', isDirect: false },
        select: {
          id: true,
          members: { where: { id: dbUser.id }, select: { id: true } },
        },
      });

      if (general && general.members.length === 0) {
        await this.prisma.channel.update({
          where: { id: general.id },
          data: { members: { connect: [{ id: dbUser.id }] } },
        });
      }
    }

    const bot = await this.prisma.user.findFirst({
      where: { email: 'bot@ai.local' },
      select: { id: true, displayName: true, avatarUrl: true },
    });

    return {
      sub: dbUser?.id,
      email: dbUser?.email,
      displayName: dbUser?.displayName,
      avatarUrl: dbUser?.avatarUrl,
      emailVerifiedAt: dbUser?.emailVerifiedAt,
      role: dbUser?.role,
      bot: bot ?? null,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/display-name')
  async updateMyDisplayName(
    @User() user: any,
    @Body() dto: UpdateDisplayNameDto,
  ) {
    const dn = (dto.displayName ?? '').trim();

    if (!dn) throw new BadRequestException('Display name is required');
    if (dn.length > 32) throw new BadRequestException('Display name too long');

    try {
      const updated = await this.usersService.updateDisplayName(user.sub, dn);
      return {
        sub: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        emailVerifiedAt: updated.emailVerifiedAt,
        role: updated.role,
      };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Username already taken');
      }
      throw e;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/avatar')
  async clearMyAvatar(@User() user: any) {
    const updated = await this.usersService.updateAvatar(user.sub, null);
    return {
      sub: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(AuthGuard('jwt'))
  @Post('me/avatar/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (!AVATAR_ALLOWED.has(file.mimetype)) {
          return cb(new BadRequestException('Avatar type not allowed'), false);
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: AVATAR_DEST,
        filename: (req: any, file, cb) => {
          const ext = extname(file.originalname) || '.png';
          const name = `${req.user.sub}-${Date.now()}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadMyAvatar(
    @User() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const updated = await this.usersService.updateAvatar(user.sub, avatarUrl);

    return {
      sub: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
    };
  }
}
