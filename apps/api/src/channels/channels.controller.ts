// apps/api/src/channels/channels.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt')) // <-- voeg deze toe (of je eigen JwtAuthGuard)
@Controller('channels')
export class ChannelsController {
  constructor(private svc: ChannelsService) {}

  // === Public channels ===
  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body('name') name: string) {
    return this.svc.create(name);
  }

  // === Direct messages ===
  @Get('direct')
  async listMyDirects(@Req() req: any) {
    const meId = req.user.sub; // <-- nu gegarandeerd gevuld
    return this.svc.listMyDirectChannels(meId);
  }

  @Get('direct/:userId')
  async getOrCreateDirect(@Req() req: any, @Param('userId') userId: string) {
    const meId = req.user.sub; // <-- nu gegarandeerd gevuld
    return this.svc.getOrCreateDirectChannel(meId, userId);
  }
}
