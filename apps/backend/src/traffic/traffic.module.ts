import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrafficController } from './traffic.controller';
import { TrafficService } from './traffic.service';

@Module({
  imports: [AuthModule],
  controllers: [TrafficController],
  providers: [TrafficService],
})
export class TrafficModule {}
