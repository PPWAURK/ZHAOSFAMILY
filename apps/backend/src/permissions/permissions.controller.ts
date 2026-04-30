import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions, SYSTEM_PERMISSIONS } from '../auth/permissions';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { PermissionsService } from './permissions.service';
import type {
  PermissionRoleItem,
  PermissionUserItem,
} from './permissions.types';

@Controller('permissions')
@UseGuards(PermissionGuard)
@RequirePermissions(SYSTEM_PERMISSIONS.managePermissions)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('users')
  listUsers(): Promise<PermissionUserItem[]> {
    return this.permissionsService.listUsers();
  }

  @Patch('users/:id/roles')
  updateUserRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRolesDto,
  ): Promise<PermissionUserItem> {
    return this.permissionsService.updateUserRoles(id, dto.roleNames);
  }

  @Get('roles')
  listRoles(): Promise<PermissionRoleItem[]> {
    return this.permissionsService.listRoles();
  }
}
