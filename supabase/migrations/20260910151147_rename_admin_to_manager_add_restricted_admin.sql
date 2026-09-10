-- Rename existing 'admin' role to 'manager' (full Catalog/Assets/Setup access, unchanged
-- permissions) to free up the 'admin' name for a new, more restricted role.
-- New 'admin' role: limited to Leads, Design, and Planner sections only.
-- 'owner' remains the Super Admin role (full access, incl. user management) — unchanged.

alter type user_role_enum rename value 'admin' to 'manager';
alter type user_role_enum add value 'admin';
