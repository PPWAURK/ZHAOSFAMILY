import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class DeleteScreenSecurityEventsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  ids!: number[];
}
