import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChannelsModule } from './channels/channels.module';
import { MessagesModule } from './messages/messages.module';
import { WsModule } from './ws/ws.module';
import { UploadsModule } from './uploads/uploads.module';
import { DigestModule } from './digest/digest.module';

const repoRoot = process.env.INIT_CWD ?? process.cwd();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(repoRoot, 'apps', 'api', '.env'),
        join(repoRoot, '.env'),
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChannelsModule,
    MessagesModule,
    WsModule,
    UploadsModule,
    DigestModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 100 }]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
