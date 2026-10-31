"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Label } from "@/components/ui/form-controls";
import { Callout, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surfaces";
import { formatCompetitionDate } from "@/components/common/formatting";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import { createSeriesAction, updateSeriesAction } from "@/server/actions/series";
import type { ChampionshipSummary } from "@/server/services/championships";

export interface SeriesEditorValue {
  readonly id: string;
  readonly name: string;
  readonly nameAr: string | null;
  readonly championshipIds: readonly string[];
}

export type SeriesEditorProps = (
  | { readonly mode: "create"; readonly series?: undefined }
  | { readonly mode: "edit"; readonly series: SeriesEditorValue }
) & {
  readonly availableChampionships: readonly ChampionshipSummary[];
  readonly locale: Locale;
};

export function SeriesEditor({ mode, series, availableChampionships, locale }: SeriesEditorProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = React.useState(series?.name ?? "");
  const [nameAr, setNameAr] = React.useState(series?.nameAr ?? "");
  const [championshipIds, setChampionshipIds] = React.useState<ReadonlySet<string>>(
    new Set(series?.championshipIds ?? []),
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function toggleChampionship(championshipId: string, checked: boolean) {
    setChampionshipIds((current) => {
      const next = new Set(current);
      if (checked) next.add(championshipId);
      else next.delete(championshipId);
      return next;
    });
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);

    const input = { name, nameAr: nameAr || undefined, championshipIds: [...championshipIds] };
    const result =
      mode === "create"
        ? await createSeriesAction(input)
        : await updateSeriesAction({ ...input, seriesId: series.id });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(mode === "create" ? t("series.createdSuccess") : t("series.updatedSuccess"));
    router.push("/series");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Callout tone="danger">{error}</Callout> : null}

      <Card>
        <CardContent className="space-y-4 pt-4">
          <Field label={t("series.seriesName")} htmlFor="series-name" required>
            <Input
              id="series-name"
              value={name}
              onChange={(nameEvent) => setName(nameEvent.target.value)}
              required
              maxLength={120}
            />
          </Field>
          <Field label={t("series.seriesNameAr")} htmlFor="series-name-ar">
            <Input
              id="series-name-ar"
              dir="rtl"
              value={nameAr}
              onChange={(nameArEvent) => setNameAr(nameArEvent.target.value)}
              maxLength={120}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>{t("series.selectChampionships")}</CardTitle>
          <p className="text-sm text-muted">{t("series.selectChampionshipsHint")}</p>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          <p className="pb-2 text-xs text-muted">
            {t("series.selectedChampionships", { count: championshipIds.size })}
          </p>
          {availableChampionships.length === 0 ? (
            <p className="text-sm text-muted">{t("championships.noChampionships")}</p>
          ) : (
            <ul className="divide-hairline -mx-4">
              {availableChampionships.map((championship) => {
                const inputId = `championship-${championship.id}`;
                return (
                  <li key={championship.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Checkbox
                      id={inputId}
                      checked={championshipIds.has(championship.id)}
                      onCheckedChange={(checked) =>
                        toggleChampionship(championship.id, checked === true)
                      }
                    />
                    <Label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer font-normal">
                      <span className="block truncate text-sm">{championship.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {formatCompetitionDate(championship.startDate, locale)} · {championship.location}
                      </span>
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={pending}>
          <Save aria-hidden />
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
