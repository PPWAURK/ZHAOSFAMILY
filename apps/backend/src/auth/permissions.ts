import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

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

export const SYSTEM_PERMISSIONS = {
  managePermissions: 'system.permission.manage',
} as const;

export function RequirePermissions(...permissions: string[]) {
  return SetMetadata(PERMISSIONS_KEY, permissions);
}
