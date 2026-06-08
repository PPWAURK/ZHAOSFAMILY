import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecruitmentRequestsController } from './recruitment-requests.controller';
import { RecruitmentRequestsService } from './recruitment-requests.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RecruitmentRequestsController],
  providers: [RecruitmentRequestsService],
})
export class RecruitmentRequestsModule {}
