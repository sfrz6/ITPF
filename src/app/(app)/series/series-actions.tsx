"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/client";
import { deleteSeriesAction, setSeriesPublishedAction } from "@/server/actions/series";

/** Row actions on the series list: publish or unpublish, and delete. */
export function SeriesActions({
  seriesId,
  seriesName,
  isPublished,
}: {
  seriesId: string;
  seriesName: string;
  isPublished: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  function togglePublished() {
    startTransition(async () => {
      const result = await setSeriesPublishedAction({ seriesId, published: !isPublished });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteSeriesAction(seriesId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirming(false);
      toast.success(t("series.deletedSuccess"));
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        size="sm"
        variant="secondary"
        onClick={togglePublished}
        loading={pending}
        aria-label={`${isPublished ? t("series.unpublish") : t("series.publish")}: ${seriesName}`}
      >
        {isPublished ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        {isPublished ? t("series.unpublish") : t("series.publish")}
      </Button>
      <Button
        size="iconSm"
        variant="ghost"
        onClick={() => setConfirming(true)}
        aria-label={`${t("series.deleteSeries")}: ${seriesName}`}
      >
        <Trash2 aria-hidden />
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("series.deleteConfirmTitle")}
        description={t("series.deleteConfirmBody")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        loading={pending}
        onConfirm={remove}
      />
    </div>
  );
}
