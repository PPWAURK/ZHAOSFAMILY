import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { BUILT_IN_ROLE_NAMES } from '../permissions.types';

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(BUILT_IN_ROLE_NAMES, { each: true, message: 'INVALID_ROLE' })
  roleNames!: string[];
}
