import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as publicly accessible, bypassing the global
 * AuthGuard. Use sparingly — only for endpoints that genuinely do not require
 * authentication (e.g. login, register, health check).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
