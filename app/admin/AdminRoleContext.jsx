"use client";

import { createContext, useContext } from "react";

// The signed-in user's tenant role ("owner" | "admin" | "staff"), resolved
// server-side in app/admin/layout.jsx via getAuthContext() and provided here
// so any admin page can read it synchronously on first render — avoiding a
// client-side fetch + null-default that would otherwise flash the wrong
// role's content before correcting itself.
const AdminRoleContext = createContext(null);

export function AdminRoleProvider({ role, children }) {
  return (
    <AdminRoleContext.Provider value={role}>
      {children}
    </AdminRoleContext.Provider>
  );
}

export function useAdminRole() {
  return useContext(AdminRoleContext);
}
