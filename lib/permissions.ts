import { ROLE_DEFINITIONS, type Permission, type RoleKey } from "@/types/permissions";

const ROLE_PERMISSIONS = new Map<RoleKey, Permission[]>(
  ROLE_DEFINITIONS.map((role) => [role.key, role.permissions]),
);

export function permissionsFor(role: RoleKey): Permission[] {
  return ROLE_PERMISSIONS.get(role) ?? [];
}

export function hasPermission(role: RoleKey, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

/** Roles allowed into the driver / customer portals. */
export const PORTAL_ROLES: RoleKey[] = ["driver", "customer"];
