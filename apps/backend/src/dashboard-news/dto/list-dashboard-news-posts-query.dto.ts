import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  DASHBOARD_NEWS_CATEGORIES,
  DASHBOARD_NEWS_VISIBILITIES,
} from '../dashboard-news.types';

export class ListDashboardNewsPostsQueryDto {
  @IsOptional()
  @IsIn(DASHBOARD_NEWS_CATEGORIES, {
    message: 'DASHBOARD_NEWS_CATEGORY_INVALID',
  })
  category?: string;

  @IsOptional()
  @IsIn(DASHBOARD_NEWS_VISIBILITIES, {
    message: 'DASHBOARD_NEWS_VISIBILITY_INVALID',
  })
  visibility?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
