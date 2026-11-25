import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';

export const MAX_REGISTRATION_BATCH = 200;

export class AddExamRegistrationsDto {
  @IsArray({ message: 'EXAM_REGISTRATION_USERS_INVALID' })
  @ArrayMinSize(1, { message: 'EXAM_REGISTRATION_USERS_INVALID' })
  @ArrayMaxSize(MAX_REGISTRATION_BATCH, {
    message: 'EXAM_REGISTRATION_USERS_INVALID',
  })
  @IsInt({ each: true, message: 'EXAM_REGISTRATION_USERS_INVALID' })
  userIds!: number[];
}
