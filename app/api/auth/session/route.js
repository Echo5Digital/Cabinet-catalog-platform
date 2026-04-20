import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/utils/api-auth";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        role: ctx.role,
        tenant_id: ctx.tenantId,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
