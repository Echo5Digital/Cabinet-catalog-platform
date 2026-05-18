export const dynamic = "force-dynamic";

import { Suspense } from "react";
import DesignWizard from "@/components/admin/design/DesignWizard";

export default function NewDesignPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-stone-400 text-sm animate-pulse">Loading…</div>}>
      <DesignWizard />
    </Suspense>
  );
}
