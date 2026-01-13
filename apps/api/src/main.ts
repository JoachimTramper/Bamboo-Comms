// apps/api/src/main.ts

import * as nodeCrypto from 'crypto';
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = nodeCrypto;
}

import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { NestExpressApplication } from '@nestjs/platform-express';
import { UPLOADS_DIR } from './uploads/uploads.constants';

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // If you're behind a proxy / load balancer (common in prod), this helps secure cookies + IP handling
  app.set('trust proxy', 1);

  // Needed for req.cookies (refresh cookie)
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.enableCors({
    origin: [
      'https://bamboo-comms.vercel.app',
      'https://bamboo-comms.joachimtramper.dev',
      'http://localhost:3001',
    ],
    credentials: true,
  });

  // Allow images/files to be embedded cross-origin (avatars etc.)
  app.use('/uploads', (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // Ensure BambooBob avatar exists in the persistent uploads volume
  const avatarsDir = join(UPLOADS_DIR, 'avatars');
  mkdirSync(avatarsDir, { recursive: true });

  const botTarget = join(avatarsDir, 'bamboobob.png');
  const repoRoot = process.env.INIT_CWD ?? process.cwd();
  const botSource = join(
    repoRoot,
    'apps',
    'api',
    'src',
    'assets',
    'bamboobob.png',
  );

  if (!existsSync(botTarget) && existsSync(botSource)) {
    copyFileSync(botSource, botTarget);
    console.log('Copied BambooBob avatar to', botTarget);
  } else if (!existsSync(botSource)) {
    console.warn('BambooBob avatar source missing at', botSource);
  }

  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
