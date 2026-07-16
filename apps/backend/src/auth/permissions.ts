import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const ANY_PERMISSIONS_KEY = 'any_permissions';

export const TRAINING_MATERIAL_PERMISSIONS = {
  read: 'training.material.read',
  play: 'training.material.play',
  create: 'training.material.create',
  update: 'training.material.update',
  delete: 'training.material.delete',
} as const;

export const TRAINING_POSITION_PERMISSIONS = {
  manage: 'training.position.manage',
} as const;

export const TRAINING_PROGRESS_PERMISSIONS = {
  viewStore: 'training.progress.view_store',
} as const;

export const TRAINING_BADGE_PERMISSIONS = {
  manage: 'training.badge.manage',
} as const;

export const TRAINING_TITLE_PERMISSIONS = {
  manage: 'training.title.manage',
} as const;

export const SCREEN_SECURITY_PERMISSIONS = {
  audit: 'screen_security.audit',
  delete: 'screen_security.delete',
} as const;

export const SYSTEM_PERMISSIONS = {
  managePermissions: 'system.permission.manage',
} as const;

export const EMPLOYEE_PERMISSIONS = {
  manageStoreJobRoles: 'employee.job_role.manage_store',
} as const;

export const RECRUITMENT_REQUEST_PERMISSIONS = {
  manage: 'recruitment.request.manage',
} as const;

export const CASE_SHARE_PERMISSIONS = {
  review: 'case.share.review',
} as const;

export const CATALOG_PERMISSIONS = {
  manageProducts: 'catalog.product.manage',
  manageSuppliers: 'catalog.supplier.manage',
  manageRestaurants: 'catalog.restaurant.manage',
} as const;

export const INVENTORY_PERMISSIONS = {
  createMovement: 'inventory.movement.create',
} as const;

export const RECIPE_PERMISSIONS = {
  manage: 'recipe.manage',
} as const;

export const ABC_INSPECTION_PERMISSIONS = {
  read: 'abc.inspection.read',
  manage: 'abc.inspection.manage',
  publish: 'abc.inspection.publish',
} as const;

// 兼容已分配旧 ABC 角色的账号。完成权限种子同步后，新权限仍是唯一标准。
export const ABC_LEGACY_SCORE_PERMISSIONS = {
  read: 'abc.score.read',
  manage: 'abc.score.fill_operations',
  publish: 'abc.score.publish',
} as const;

export function RequirePermissions(...permissions: string[]) {
  return SetMetadata(PERMISSIONS_KEY, permissions);
}

export function RequireAnyPermissions(...permissions: string[]) {
  return SetMetadata(ANY_PERMISSIONS_KEY, permissions);
}
