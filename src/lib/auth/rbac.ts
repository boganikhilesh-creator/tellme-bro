import { ROLES, RoleType } from '../constants';

export const ROLE_HIERARCHY: Record<RoleType, number> = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.EDITOR]: 2,
  [ROLES.USER]: 1,
};

export function getSuperAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL || 'boganikhilesh@gmail.com').toLowerCase().trim();
}

export function isSuperAdminEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return normalized === getSuperAdminEmail() || normalized === 'boganikhilesh@gmail.com';
}

/**
 * Checks if a given role is at least one of the allowed roles.
 */
export function hasRole(currentRole: string, allowedRoles: RoleType[]): boolean {
  return allowedRoles.includes(currentRole as RoleType);
}

/**
 * Evaluates whether an actor can view/modify a target user based on roles.
 */
export function canActorManageTarget(actorRole: string, targetRole: string): boolean {
  if (actorRole === ROLES.SUPER_ADMIN) return true;
  if (actorRole === ROLES.ADMIN) {
    // Admin cannot modify Super Admin or other Admins
    return targetRole === ROLES.EDITOR || targetRole === ROLES.USER;
  }
  return false;
}

/**
 * Evaluates whether an actor can assign a new role to a target.
 * Super Admin can promote/demote anyone (except another Super Admin).
 * Admin can only assign EDITOR or USER roles to lower-ranking users.
 * Regular users and editors cannot change roles.
 */
export function canAssignRole(
  actorRole: string,
  targetCurrentRole: string,
  newRole: string
): { allowed: boolean; reason?: string } {
  if (actorRole === ROLES.USER || actorRole === ROLES.EDITOR) {
    return { allowed: false, reason: 'Insufficient permissions to change roles' };
  }

  // Nobody can create a second SUPER_ADMIN through UI/API
  if (newRole === ROLES.SUPER_ADMIN) {
    return {
      allowed: false,
      reason: 'The Super Admin role is unique and cannot be assigned via the API',
    };
  }

  // Nobody can demote or alter the Super Admin through UI/API
  if (targetCurrentRole === ROLES.SUPER_ADMIN) {
    return {
      allowed: false,
      reason: 'The Super Admin cannot be modified or demoted',
    };
  }

  // Super Admin can assign ADMIN, EDITOR, or USER
  if (actorRole === ROLES.SUPER_ADMIN) {
    return { allowed: true };
  }

  // Admin can only change EDITOR <-> USER, and cannot touch Admins
  if (actorRole === ROLES.ADMIN) {
    if (targetCurrentRole === ROLES.ADMIN) {
      return { allowed: false, reason: 'Admins cannot modify other Admins' };
    }
    if (newRole === ROLES.ADMIN) {
      return { allowed: false, reason: 'Only the Super Admin can promote users to Admin' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Unauthorized action' };
}
