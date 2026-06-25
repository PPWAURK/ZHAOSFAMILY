import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WaitingQueueController } from './waiting-queue.controller';
import { WaitingQueueService } from './waiting-queue.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WaitingQueueController],
  providers: [WaitingQueueService],
})
export class WaitingQueueModule {}
