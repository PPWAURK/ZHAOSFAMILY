import { Module } from '@nestjs/common';
import { MinioModule } from '../minio/minio.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [MinioModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
