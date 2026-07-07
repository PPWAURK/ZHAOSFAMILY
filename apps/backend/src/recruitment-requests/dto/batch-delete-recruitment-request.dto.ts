import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class BatchDeleteRecruitmentRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids!: number[];
}
