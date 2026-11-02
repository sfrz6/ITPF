"use client";

import * as React from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItpfLogo } from "@/components/common/itpf-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surfaces";
import { useI18n } from "@/lib/i18n/client";
import type { DayNumber, StandingsScope, StandingsSubject } from "@/domain/results";
import {
  availableScopes,
  scopeLabelKey,
  type StandingsSet,
} from "@/components/results/standings-data";
import {
  StandingsTable,
  StandingsToggle,
  type ToggleOption,
} from "@/components/results/standings-table";

/**
 * The published standings, with the same rows the officials see internally.
 *
 * The rows are computed on the server by the results engine and arrive already
 * ranked and formatted, so this component only chooses which set to show.
 */
export function PublicStandings({
  days,
  sets,
  slug,
  pdfAvailable,
  championshipId,
  hasChampionshipLogo,
}: {
  days: readonly DayNumber[];
  sets: readonly StandingsSet[];
  slug: string;
  /** Whether a PDF can be produced for each scope, see `pdfAvailability`. */
  pdfAvailable: Partial<Record<StandingsScope, boolean>>;
  championshipId: string;
  hasChampionshipLogo: boolean;
}) {
  const { t } = useI18n();
  const [subject, setSubject] = React.useState<StandingsSubject>("INDIVIDUAL");
  const [scope, setScope] = React.useState<StandingsScope>("OVERALL");

  const scopes = availableScopes(days);
  const activeScope = scopes.includes(scope) ? scope : "OVERALL";

  const subjectOptions: readonly ToggleOption<StandingsSubject>[] = [
    { value: "INDIVIDUAL", label: t("results.individual") },
    { value: "COUNTRY", label: t("results.countries") },
  ];
  const scopeOptions: readonly ToggleOption<StandingsScope>[] = scopes.map((value) => ({
    value,
    label: t(scopeLabelKey(value)),
  }));

  const set = sets.find((item) => item.scope === activeScope && item.subject === subject);

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3">
        <CardTitle className="text-base">
          {subject === "COUNTRY"
            ? t("publicResults.countryStandings")
            : t("publicResults.individualStandings")}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <StandingsToggle
            label={t("results.selectSubject")}
            value={subject}
            options={subjectOptions}
            onChange={(value) => setSubject(value)}
          />
          <StandingsToggle
            label={t("results.selectScope")}
            value={activeScope}
            options={scopeOptions}
            onChange={(value) => setScope(value)}
          />
          {pdfAvailable[activeScope] ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/results/${slug}/pdf/${activeScope}`} target="_blank">
                <Download aria-hidden />
                {t("publicResults.downloadPdf")}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="relative">
        {/* Fills the empty space a short list leaves below its rows. A row's
            own solid background still covers it, so it only ever shows
            through genuinely empty space, same as the printed watermark. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
        >
          {hasChampionshipLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/championships/${championshipId}/logo/championship`}
              alt=""
              className="h-auto w-48 object-contain opacity-10 sm:w-64"
            />
          ) : (
            <ItpfLogo width={192} className="opacity-10" />
          )}
        </div>
        <div className="relative z-10">
          <StandingsTable subject={subject} rows={set?.rows ?? []} />
        </div>
      </CardContent>
    </Card>
  );
}
