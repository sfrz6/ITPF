"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/client";
import { resetEventAction } from "@/server/actions/runs";

/**
 * Lets an administrator wipe an entire event back to its starting state,
 * for recovering from a lineup mistake that was confirmed and already
 * propagated into later runs. Admin only, confirmed with a destructive
 * dialog since it permanently discards entry orders and scores.
 */
export function ResetEventButton({
  eventId,
  eventLabel,
}: {
  eventId: string;
  eventLabel: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  function reset() {
    startTransition(async () => {
      const result = await resetEventAction({ eventId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirming(false);
      toast.success(t("runs.resetEventSuccess"));
      router.refresh();
    });
  }

  return (
    <>
      <Button
        size="iconSm"
        variant="ghost"
        onClick={() => setConfirming(true)}
        aria-label={`${t("runs.resetEvent")}: ${eventLabel}`}
      >
        <RotateCcw aria-hidden />
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("runs.resetEventConfirmTitle")}
        description={t("runs.resetEventConfirmBody")}
        confirmLabel={t("runs.resetEvent")}
        cancelLabel={t("common.cancel")}
        destructive
        loading={pending}
        onConfirm={reset}
      />
    </>
  );
}
