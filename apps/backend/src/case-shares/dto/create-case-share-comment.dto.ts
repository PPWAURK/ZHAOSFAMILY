import { IsString, Length } from 'class-validator';

export class CreateCaseShareCommentDto {
  @IsString({ message: 'CASE_SHARE_COMMENT_REQUIRED' })
  @Length(1, 300, { message: 'CASE_SHARE_COMMENT_INVALID_LENGTH' })
  content!: string;
}
