import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DASHBOARD_NEWS_CATEGORIES,
  DASHBOARD_NEWS_VISIBILITIES,
} from '../dashboard-news.types';

export class CreateDashboardNewsPostDto {
  @IsString({ message: 'DASHBOARD_NEWS_TITLE_REQUIRED' })
  @Length(1, 120, { message: 'DASHBOARD_NEWS_TITLE_INVALID_LENGTH' })
  title!: string;

  @IsString({ message: 'DASHBOARD_NEWS_SUMMARY_REQUIRED' })
  @Length(1, 240, { message: 'DASHBOARD_NEWS_SUMMARY_INVALID_LENGTH' })
  summary!: string;

  @IsString({ message: 'DASHBOARD_NEWS_BODY_REQUIRED' })
  @Length(1, 5000, { message: 'DASHBOARD_NEWS_BODY_INVALID_LENGTH' })
  body!: string;

  @IsIn(DASHBOARD_NEWS_CATEGORIES, {
    message: 'DASHBOARD_NEWS_CATEGORY_INVALID',
  })
  category!: string;

  @IsIn(DASHBOARD_NEWS_VISIBILITIES, {
    message: 'DASHBOARD_NEWS_VISIBILITY_INVALID',
  })
  visibility!: string;

  @IsOptional()
  @IsArray({ message: 'DASHBOARD_NEWS_TAGS_INVALID' })
  @ArrayMaxSize(8, { message: 'DASHBOARD_NEWS_TAGS_TOO_MANY' })
  @IsString({ each: true, message: 'DASHBOARD_NEWS_TAG_INVALID' })
  @MaxLength(32, {
    each: true,
    message: 'DASHBOARD_NEWS_TAG_INVALID_LENGTH',
  })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  attachmentMimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  attachmentSizeBytes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  attachmentBucket?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentObjectKey?: string;
}
