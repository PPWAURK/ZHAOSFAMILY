import type { Request } from 'express';
import type { AuthUser } from './auth.service';

/**
 * Request enriched by the global AuthGuard. On every non-@Public route the
 * guard resolves the caller once and attaches the full AuthUser (permissions
 * included) here, so downstream guards/controllers reuse it instead of
 * re-querying the database.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
