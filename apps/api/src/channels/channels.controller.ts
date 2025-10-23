import { Body, Controller, Get, Post } from '@nestjs/common';
import { ChannelsService } from './channels.service';

@Controller('channels')
export class ChannelsController {
  constructor(private svc: ChannelsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body('name') name: string) {
    return this.svc.create(name);
  }
}
