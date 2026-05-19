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
import { UpdateUserJobRoleDto } from './dto/update-user-job-role.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { PermissionsService } from './permissions.service';
import type {
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

  @Get('roles')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.managePermissions)
  listRoles(): Promise<PermissionRoleItem[]> {
    return this.permissionsService.listRoles();
  }
}
