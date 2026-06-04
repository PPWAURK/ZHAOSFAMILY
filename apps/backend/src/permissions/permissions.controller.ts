import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions, SYSTEM_PERMISSIONS } from '../auth/permissions';
import { UpdateUserApprovalDto } from './dto/update-user-approval.dto';
import { UpdateUserJobRoleDto } from './dto/update-user-job-role.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateManagedRestaurantsDto } from './dto/update-managed-restaurants.dto';
import { PermissionsService } from './permissions.service';
import type {
  ManageableRestaurantItem,
  PermissionRoleItem,
  PermissionUserItem,
} from './permissions.types';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly authService: AuthService,
  ) {}

  @Get('users')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.managePermissions)
  listUsers(): Promise<PermissionUserItem[]> {
    return this.permissionsService.listUsers();
  }

  @Get('users/approvals')
  async listApprovableUsers(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PermissionUserItem[]> {
    const viewer = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.permissionsService.listApprovableUsers(viewer);
  }

  @Get('restaurants/manageable')
  async listManageableRestaurants(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ManageableRestaurantItem[]> {
    const viewer = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.permissionsService.listManageableRestaurants(viewer);
  }

  @Patch('users/:id/roles')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.managePermissions)
  updateUserRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRolesDto,
  ): Promise<PermissionUserItem> {
    return this.permissionsService.updateUserRoles(id, dto.roleNames);
  }

  @Patch('users/:id/job-role')
  async updateUserJobRole(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserJobRoleDto,
  ): Promise<PermissionUserItem> {
    const viewer = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.permissionsService.updateUserJobRole(viewer, id, dto.jobRole);
  }

  @Patch('users/:id/managed-restaurants')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.managePermissions)
  updateManagedRestaurants(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManagedRestaurantsDto,
  ): Promise<PermissionUserItem> {
    return this.permissionsService.updateManagedRestaurants(
      id,
      dto.restaurantIds,
    );
  }

  @Patch('users/:id/approval')
  async updateUserApproval(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserApprovalDto,
  ): Promise<PermissionUserItem> {
    const viewer = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.permissionsService.updateUserApproval(viewer, id, dto);
  }

  @Get('roles')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.managePermissions)
  listRoles(): Promise<PermissionRoleItem[]> {
    return this.permissionsService.listRoles();
  }
}
