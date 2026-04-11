import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalNotesController } from './internal-notes.controller';
import { InternalNotesService } from './internal-notes.service';

@Module({
  imports: [PrismaModule],
  controllers: [InternalNotesController],
  providers: [InternalNotesService],
  exports: [InternalNotesService],
})
export class InternalNotesModule {}
