import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateExamSessionDto {
  @IsInt({ message: 'EXAM_TEMPLATE_INVALID' })
  templateId!: number;

  @IsOptional()
  @IsString({ message: 'EXAM_SESSION_LABEL_INVALID' })
  @MaxLength(100, { message: 'EXAM_SESSION_LABEL_INVALID' })
  label?: string;

  @IsOptional()
  @IsDateString({}, { message: 'EXAM_SESSION_WINDOW_INVALID' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'EXAM_SESSION_WINDOW_INVALID' })
  endsAt?: string;
}

export class JoinExamSessionDto {
  @IsString({ message: 'EXAM_SESSION_CODE_INVALID' })
  @Matches(/^\d{6}$/, { message: 'EXAM_SESSION_CODE_INVALID' })
  code!: string;
}
