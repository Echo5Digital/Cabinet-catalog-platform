/**
 * Role mapping between this platform's tenant_users.role and the Cabinets &
 * Remodeling Depot's User.role, used when syncing admin accounts between the
 * two systems (see app/api/admin/users, lib/webhooks/notifyDepot.js).
 *
 * Both platforms use the same three-tier model and the same access-level
 * meanings — only the casing differs (this platform: lowercase; Depot:
 * upper snake case) — so this is a plain 1:1 mapping, not a behavioral one:
 *
 *   owner <-> SUPER_ADMIN  (full access, incl. user management)
 *   admin <-> ADMIN        (Dashboard/Leads/Design/Planner + Users; cannot
 *                            see/manage Super Admins)
 *   staff <-> STAFF        (Dashboard/Leads/Design/Planner only, no Users)
 */
const DEPOT_TO_PLATFORM = {
  SUPER_ADMIN: "owner",
  ADMIN: "admin",
  STAFF: "staff",
};

const PLATFORM_TO_DEPOT = {
  owner: "SUPER_ADMIN",
  admin: "ADMIN",
  staff: "STAFF",
};

export function depotRoleToPlatformRole(depotRole) {
  return DEPOT_TO_PLATFORM[depotRole] || null;
}

export function platformRoleToDepotRole(platformRole) {
  return PLATFORM_TO_DEPOT[platformRole] || null;
}
