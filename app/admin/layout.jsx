import { getAuthContext } from "@/lib/utils/api-auth";
import AdminLayoutClient from "./AdminLayoutClient";

// Server Component: resolves the signed-in user's role during SSR (same
// getAuthContext() used by every API route) and passes it down as a prop,
// so the client-rendered sidebar knows the correct role on its very first
// paint instead of defaulting to a placeholder and correcting itself once a
// client-side fetch resolves — that gap was the cause of the nav briefly
// showing the wrong (too-limited or too-broad) set of items after login.
export default async function AdminLayout({ children }) {
  const ctx = await getAuthContext();

  return (
    <AdminLayoutClient initialRole={ctx.role}>
      {children}
    </AdminLayoutClient>
  );
}
