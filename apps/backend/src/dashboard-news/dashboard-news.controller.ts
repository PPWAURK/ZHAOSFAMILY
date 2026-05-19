import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { CreateDashboardNewsPostDto } from './dto/create-dashboard-news-post.dto';
import { ListDashboardNewsPostsQueryDto } from './dto/list-dashboard-news-posts-query.dto';
import { DashboardNewsService } from './dashboard-news.service';
import type {
  DashboardNewsActor,
  DashboardNewsPost,
} from './dashboard-news.types';

@Controller('dashboard-news')
export class DashboardNewsController {
  constructor(
    private readonly authService: AuthService,
    private readonly dashboardNewsService: DashboardNewsService,
  ) {}

  @Get()
  async listPosts(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListDashboardNewsPostsQueryDto,
  ): Promise<DashboardNewsPost[]> {
    return this.dashboardNewsService.listPosts(
      await this.getActor(authorization),
      query,
    );
  }

  @Get(':id')
  async getPost(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DashboardNewsPost> {
    return this.dashboardNewsService.getPost(
      await this.getActor(authorization),
      id,
    );
  }

  @Post()
  async createPost(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateDashboardNewsPostDto,
  ): Promise<DashboardNewsPost> {
    return this.dashboardNewsService.createPost(
      await this.getActor(authorization),
      dto,
    );
  }

  @Delete(':id')
  async deletePost(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: 'DASHBOARD_NEWS_POST_DELETED' }> {
    await this.dashboardNewsService.deletePost(
      await this.getActor(authorization),
      id,
    );

    return { message: 'DASHBOARD_NEWS_POST_DELETED' };
  }

  private async getActor(
    authorization: string | undefined,
  ): Promise<DashboardNewsActor> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return {
      id: user.id,
      jobRole: user.jobRole,
      restaurantId: user.restaurantId,
      userLevel: user.userLevel,
    };
  }
}
