"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/**
 * On screen controls for the round sheet. Hidden when the document is printed,
 * so the paper copy carries nothing but the official content.
 */
export function PrintTrigger() {
  const { t } = useI18n();
  return (
    <div className="print-hidden mb-4 flex justify-end">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-400 px-3 py-1.5 text-sm text-black transition-colors hover:bg-neutral-100"
      >
        <Printer className="size-4" aria-hidden />
        {t("common.print")}
      </button>
    </div>
  );
}
