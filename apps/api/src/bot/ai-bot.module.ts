import { Module } from '@nestjs/common';
import { AiBotService } from './ai-bot.service';

@Module({
  providers: [AiBotService],
  exports: [AiBotService],
})
export class BotModule {}
