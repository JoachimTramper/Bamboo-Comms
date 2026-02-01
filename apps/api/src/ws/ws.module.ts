// apps/api/src/ws/ws.module.ts
import { Module } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PresenceService } from './presence.service';
import { WsAuthService } from './ws.auth';
import { WsWelcomeService } from './ws.welcome';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [WsGateway, PresenceService, WsAuthService, WsWelcomeService],
  exports: [WsGateway, PresenceService],
})
export class WsModule {}
