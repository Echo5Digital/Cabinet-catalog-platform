-- Collapse user_role_enum from five values (owner, manager, admin, editor,
-- viewer — plus the undocumented legacy string 'super_admin' some rows still
-- carry) down to three, matching the Cabinets & Remodeling Depot's own role
-- model exactly:
--
--   owner  — Super Admin, full access (was: owner, and legacy 'super_admin')
--   admin  — full access minus seeing/managing Super Admins, PLUS user
--            management (was: manager's access level, under a new name)
--   staff  — restricted to Dashboard/Leads/Design/Planner only, no Users
--            (was: the old restricted 'admin' role's access level, under a
--            new name — NOT the same meaning as the new 'admin' above)
--
-- 'editor' and 'viewer' had zero rows in production at the time of writing
-- and are retired with no data to carry forward.
--
-- Postgres enum types cannot drop individual values, so this creates a new
-- 3-value type, migrates the column across with an explicit mapping, then
-- swaps the old type out entirely (rather than leaving unused legacy labels
-- on the type permanently).

-- 1. New type, named distinctly to avoid colliding with the old one during migration.
create type user_role_enum_v2 as enum ('owner', 'admin', 'staff');

-- 2. Drop the default before changing the column type (defaults referencing
--    the old enum type block the type change).
alter table tenant_users alter column role drop default;

-- 3. Migrate the column, mapping old values to new by ACCESS LEVEL, not by
--    matching label — the old 'admin' (restricted) becomes 'staff', and the
--    old 'manager' (full access) becomes the new 'admin'.
alter table tenant_users
  alter column role type user_role_enum_v2
  using (
    case role::text
      when 'owner'       then 'owner'
      when 'super_admin' then 'owner'
      when 'manager'     then 'admin'
      when 'admin'       then 'staff'
      when 'editor'      then 'staff'
      when 'viewer'      then 'staff'
    end
  )::user_role_enum_v2;

-- 4. Restore a default under the new type.
alter table tenant_users alter column role set default 'staff';

-- 5. Swap the type names so application code and future migrations refer to
--    the plain name `user_role_enum`.
drop type user_role_enum;
alter type user_role_enum_v2 rename to user_role_enum;
