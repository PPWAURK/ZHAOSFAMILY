import { IsUUID } from 'class-validator';

export class RecordWebPageviewDto {
  @IsUUID('4')
  visitorId!: string;
}
