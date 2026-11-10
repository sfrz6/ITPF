"use client";

import * as React from "react";
import { EmptyState } from "@/components/ui/surfaces";
import { Table, TBody, Td, TdNum, THead, Th, ThNum, TableWrapper, Tr } from "@/components/ui/table";
import { StandingsToggle, type ToggleOption } from "@/components/results/standings-table";
import { useI18n } from "@/lib/i18n/client";
import type { CountryRiderRankingRow } from "@/server/services/public-countries";
import type { SeriesRankingDiscipline } from "@/server/services/series";

/**
 * This country's own athletes, ranked only against each other — no
 * Athletes/National Teams toggle like the series rankings table, since
 * every row here already belongs to the one country the page is about.
 */
export function CountryRiderTable({
  rows,
}: {
  rows: Readonly<Record<SeriesRankingDiscipline, readonly CountryRiderRankingRow[]>>;
}) {
  const { t } = useI18n();
  const [discipline, setDiscipline] = React.useState<SeriesRankingDiscipline>("ALL");

  const options: readonly ToggleOption<SeriesRankingDiscipline>[] = [
    { value: "ALL", label: t("rankings.allEvents") },
    { value: "LANCE", label: t("rankings.lance") },
    { value: "SWORD", label: t("rankings.sword") },
    { value: "HANGING", label: t("rankings.hangingTargets") },
  ];

  const activeRows = rows[discipline];

  return (
    <div className="space-y-3">
      <StandingsToggle
        label={t("rankings.selectDiscipline")}
        value={discipline}
        options={options}
        onChange={setDiscipline}
      />

      {activeRows.length === 0 ? (
        <EmptyState title={t("publicRiders.noRidersYet")} />
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <Tr>
                <ThNum className="w-14 text-center">{t("common.rank")}</ThNum>
                <Th>{t("common.athlete")}</Th>
                <ThNum>{t("common.total")}</ThNum>
              </Tr>
            </THead>
            <TBody>
              {activeRows.map((row) => (
                <Tr key={row.riderId} className={row.rank <= 3 ? "font-medium" : undefined}>
                  <TdNum className="w-14 text-center text-muted">{row.rank}</TdNum>
                  <Td>{row.name}</Td>
                  <TdNum className="font-semibold">{row.total}</TdNum>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}
    </div>
  );
}
