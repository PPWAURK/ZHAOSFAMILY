import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AbcScoresController } from './abc-scores.controller';
import { AbcScoresService } from './abc-scores.service';

@Module({
  imports: [AuthModule, PrismaModule, MediaModule],
  controllers: [AbcScoresController],
  providers: [AbcScoresService],
})
export class AbcScoresModule {}
