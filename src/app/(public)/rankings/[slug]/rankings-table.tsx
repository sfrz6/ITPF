"use client";

import * as React from "react";
import { CountryFlag } from "@/components/common/country-flag";
import { ItpfLogo } from "@/components/common/itpf-logo";
import { EmptyState } from "@/components/ui/surfaces";
import { Table, TBody, Td, TdNum, THead, Th, ThNum, TableWrapper, Tr } from "@/components/ui/table";
import { StandingsToggle, type ToggleOption } from "@/components/results/standings-table";
import { useI18n } from "@/lib/i18n/client";
import type { SeriesRankingDiscipline, SeriesRankingRow } from "@/server/services/series";

/**
 * The series leaderboard: rank, name and total only. Unlike a single
 * championship's standings table, this deliberately drops the
 * per-championship breakdown columns — the series can grow to many
 * championships, and the combined total is the number that matters here.
 *
 * A second toggle narrows the same leaderboard to just Lance or just Sword
 * events, so a visitor can see who's actually best at one discipline rather
 * than only the combined total.
 */
export function RankingsTable({
  individual,
  country,
}: {
  individual: Readonly<Record<SeriesRankingDiscipline, readonly SeriesRankingRow[]>>;
  country: Readonly<Record<SeriesRankingDiscipline, readonly SeriesRankingRow[]>>;
}) {
  const { t } = useI18n();
  const [subject, setSubject] = React.useState<"INDIVIDUAL" | "COUNTRY">("INDIVIDUAL");
  const [discipline, setDiscipline] = React.useState<SeriesRankingDiscipline>("ALL");

  const subjectOptions: readonly ToggleOption<"INDIVIDUAL" | "COUNTRY">[] = [
    { value: "INDIVIDUAL", label: t("rankings.individual") },
    { value: "COUNTRY", label: t("rankings.countries") },
  ];
  const disciplineOptions: readonly ToggleOption<SeriesRankingDiscipline>[] = [
    { value: "ALL", label: t("rankings.allEvents") },
    { value: "LANCE", label: t("rankings.lance") },
    { value: "SWORD", label: t("rankings.sword") },
  ];

  const rows = (subject === "INDIVIDUAL" ? individual : country)[discipline];
  const isCountry = subject === "COUNTRY";
  // One watermark per ten rows, same as the public standings table: a
  // single mark would either sit buried mid-list or never be reached on a
  // long leaderboard. No championship logo here — a series spans several
  // championships, so the ITPF mark is the only one that makes sense.
  const watermarkCount = Math.max(1, Math.ceil(rows.length / 10));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StandingsToggle
          label={t("rankings.selectSubject")}
          value={subject}
          options={subjectOptions}
          onChange={setSubject}
        />
        <StandingsToggle
          label={t("rankings.selectDiscipline")}
          value={discipline}
          options={disciplineOptions}
          onChange={setDiscipline}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t("rankings.noResultsYet")} />
      ) : (
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-around overflow-hidden"
          >
            {Array.from({ length: watermarkCount }).map((_, i) => (
              <ItpfLogo key={i} width={240} className="opacity-10" />
            ))}
          </div>
          <div className="relative z-10">
            <TableWrapper className="bg-transparent">
              <Table>
                <THead>
                  <Tr>
                    <ThNum className="w-14 text-center">{t("common.rank")}</ThNum>
                    <Th>{isCountry ? t("common.team") : t("common.athlete")}</Th>
                    <ThNum>{t("common.total")}</ThNum>
                  </Tr>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <Tr key={row.key} className={row.rank <= 3 ? "font-medium" : undefined}>
                      <TdNum className="w-14 text-center text-muted">{row.rank}</TdNum>
                      <Td>
                        <span className="flex items-center gap-2">
                          <CountryFlag iso2={row.iso2} className="shrink-0" />
                          <span className="min-w-0 max-w-64 flex-1 truncate">
                            {row.name}
                            {!isCountry && row.countryName ? (
                              <span className="block truncate text-xs text-muted">
                                {row.countryName}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </Td>
                      <TdNum className="font-semibold">{row.total}</TdNum>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrapper>
          </div>
        </div>
      )}
    </div>
  );
}
