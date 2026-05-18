export const dynamic = "force-dynamic";

import { Suspense } from "react";
import DesignWizard from "@/components/admin/design/DesignWizard";

export default function NewDesignPage() {
  return (
    <Suspense>
      <DesignWizard />
    </Suspense>
  );
}
