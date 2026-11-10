"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-controls";
import { Callout, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surfaces";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/client";
import { formatDateTime } from "@/components/common/formatting";
import type { EventTypeKey } from "@/domain/scoring/event-types";
import type { RunStatus } from "@/server/services/runs";
import { correctRunAction, reviewEventAction } from "@/server/actions/runs";
import {
  ScoringGrid,
  buildDraft,
  draftToPayload,
  type ScoringDraft,
} from "../../../runs/[runId]/scoring-grid";
import { ReviewTable, type ReviewTableCountry } from "./review-table";

export interface EventReviewRun {
  readonly runId: string;
  readonly runNumber: number;
  readonly pegSizeCm: string;
  readonly timeLimitSeconds: string;
  readonly status: RunStatus;
  readonly version: number;
  readonly countries: readonly ReviewTableCountry[];
}

export function EventReview({
  championshipId,
  eventId,
  eventType,
  reviewedAt,
  reviewedByName,
  allRunsConfirmed,
  confirmedDayTotalByCountry,
  runs,
  permissions,
}: {
  championshipId: string;
  eventId: string;
  eventType: EventTypeKey;
  reviewedAt: string | null;
  reviewedByName: string | null;
  allRunsConfirmed: boolean;
  confirmedDayTotalByCountry: Readonly<Record<string, string>>;
  runs: readonly EventReviewRun[];
  permissions: { editConfirmed: boolean; confirmRuns: boolean };
}) {
  const { locale, t } = useI18n();
  const router = useRouter();

  function freshDrafts(): Record<string, ScoringDraft> {
    return Object.fromEntries(runs.map((run) => [run.runId, buildDraft(run.countries)]));
  }

  const [drafts, setDrafts] = React.useState<Record<string, ScoringDraft>>(freshDrafts);
  const [correcting, setCorrecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [reasonError, setReasonError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function changedRunIds(): string[] {
    return runs
      .filter(
        (run) => JSON.stringify(drafts[run.runId]) !== JSON.stringify(buildDraft(run.countries)),
      )
      .map((run) => run.runId);
  }

  function cancelCorrecting() {
    setCorrecting(false);
    setReason("");
    setReasonError(null);
    setDrafts(freshDrafts());
  }

  /** Saves every changed run's correction. Returns false on the first failure, having already surfaced it. */
  async function applyCorrections(changed: readonly string[]): Promise<boolean> {
    for (const runId of changed) {
      const run = runs.find((candidate) => candidate.runId === runId);
      if (!run) continue;
      const result = await correctRunAction({
        runId,
        expectedVersion: run.version,
        payload: draftToPayload(run.countries, drafts[runId] ?? buildDraft(run.countries)),
        reason: reason.trim(),
      });
      if (!result.ok) {
        if (result.fieldErrors?.reason) setReasonError(result.fieldErrors.reason);
        toast.error(result.error);
        return false;
      }
    }
    return true;
  }

  /** First-time review: corrects whatever changed, then marks the event reviewed. */
  function submit() {
    const changed = changedRunIds();
    if (changed.length > 0 && reason.trim().length < 5) {
      setReasonError(t("runs.reasonRequired"));
      return;
    }
    setReasonError(null);
    startTransition(async () => {
      if (!(await applyCorrections(changed))) {
        setConfirmOpen(false);
        return;
      }

      const reviewResult = await reviewEventAction({ eventId });
      if (!reviewResult.ok) {
        setConfirmOpen(false);
        toast.error(reviewResult.error);
        return;
      }

      setConfirmOpen(false);
      setCorrecting(false);
      setReason("");
      toast.success(t("runs.eventReviewedSuccess"));
      router.push(`/championships/${championshipId}`);
      router.refresh();
    });
  }

  /** Already reviewed: the review page stays reopenable, so a mistake spotted later still goes through the same correction flow, just without re-confirming the review itself. */
  function saveCorrections() {
    const changed = changedRunIds();
    if (changed.length === 0) {
      setCorrecting(false);
      return;
    }
    if (reason.trim().length < 5) {
      setReasonError(t("runs.reasonRequired"));
      return;
    }
    setReasonError(null);
    startTransition(async () => {
      if (!(await applyCorrections(changed))) return;
      setCorrecting(false);
      setReason("");
      toast.success(t("runs.correctionSaved"));
      router.refresh();
    });
  }

  if (!allRunsConfirmed) {
    return <Callout tone="warning">{t("runs.eventReviewNotReady")}</Callout>;
  }

  const hasChanges = changedRunIds().length > 0;
  const alreadyReviewed = reviewedAt !== null;

  return (
    <div className="space-y-5">
      {alreadyReviewed ? (
        <Callout tone="success" title={t("runs.eventReviewed")}>
          <p>
            {reviewedByName ? t("runs.reviewedBy", { name: reviewedByName }) + " · " : ""}
            {formatDateTime(new Date(reviewedAt), locale)}
          </p>
        </Callout>
      ) : null}

      <Card>
        <CardHeader className="py-3">
          <p className="text-sm text-muted">{t("runs.reviewEventHint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {permissions.editConfirmed && !correcting ? (
              <Button variant="secondary" size="sm" onClick={() => setCorrecting(true)}>
                <Pencil aria-hidden />
                {t("runs.editConfirmed")}
              </Button>
            ) : null}
            {!alreadyReviewed && permissions.confirmRuns ? (
              <Button
                size="sm"
                loading={pending}
                onClick={() => (hasChanges ? submit() : setConfirmOpen(true))}
              >
                <ShieldCheck aria-hidden />
                {t("runs.confirmReview")}
              </Button>
            ) : null}
            {correcting && (alreadyReviewed || !permissions.confirmRuns) ? (
              <Button size="sm" loading={pending} disabled={!hasChanges} onClick={saveCorrections}>
                <ShieldCheck aria-hidden />
                {t("common.save")}
              </Button>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {correcting ? (
        <Card className="border-warning/50">
          <CardHeader className="py-3">
            <CardTitle>{t("runs.editConfirmedTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Callout tone="warning">{t("runs.editConfirmedHint")}</Callout>
            <Field
              label={t("runs.reasonLabel")}
              htmlFor="review-reason"
              required
              error={reasonError}
            >
              <Textarea
                id="review-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("runs.reasonPlaceholder")}
                maxLength={1000}
                aria-invalid={reasonError ? true : undefined}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={cancelCorrecting}>
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {correcting ? (
        runs.map((run) => (
          <section key={run.runId} className="space-y-2">
            <h3 className="text-sm font-semibold">
              {t("templates.runNumber", { number: run.runNumber })}
            </h3>
            <ScoringGrid
              eventType={eventType}
              timeLimitSeconds={run.timeLimitSeconds}
              countries={run.countries}
              draft={drafts[run.runId] ?? buildDraft(run.countries)}
              onChange={(next) => setDrafts({ ...drafts, [run.runId]: next })}
              readOnly={false}
              confirmedDayTotalByCountry={confirmedDayTotalByCountry}
            />
          </section>
        ))
      ) : (
        <ReviewTable eventType={eventType} runs={runs} />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("runs.confirmReviewTitle")}
        description={t("runs.confirmReviewBody")}
        confirmLabel={t("runs.confirmReview")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={submit}
      />
    </div>
  );
}
