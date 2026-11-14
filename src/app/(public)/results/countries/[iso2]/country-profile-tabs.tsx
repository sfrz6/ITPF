"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Award, CalendarDays, Medal, Search, Trophy, Users } from "lucide-react";
import {
  championshipDisplayName,
  formatCompetitionDateRange,
  formatOrdinal,
} from "@/components/common/formatting";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/surfaces";
import { Table, TBody, Td, TdNum, THead, Th, ThNum, TableWrapper, Tr } from "@/components/ui/table";
import { StandingsToggle, type ToggleOption } from "@/components/results/standings-table";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import type { CountryProfile, CountryProfileResultScope } from "@/server/services/public-countries";
import type { SeriesRankingDiscipline } from "@/server/services/series";

function rankBadgeClassName(rank: number): string {
  if (rank === 1) return "border-accent/40 bg-accent-subtle text-accent";
  if (rank === 2) return "border-silver/50 bg-silver/15 text-foreground";
  return "border-bronze/50 bg-bronze/15 text-foreground";
}

function PendingDot({ label }: { label: string }) {
  return (
    <span
      className="size-1.5 shrink-0 rounded-full bg-success motion-safe:animate-pulse"
      aria-hidden
      title={label}
    />
  );
}

/** Small stat tile reused across the Overview tab. */
function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-lg font-extrabold leading-tight text-foreground">{value}</div>
        <div className="truncate text-xs font-semibold text-muted">{label}</div>
      </div>
    </Card>
  );
}

export function CountryProfileTabs({
  profile,
}: {
  profile: CountryProfile;
}) {
  const { t, locale } = useI18n();
  // The Athletes directory links straight into this tab (`?tab=athletes`)
  // rather than its own separate page now that the two are merged.
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "athletes" ? "athletes" : "overview";
  const [tab, setTab] = React.useState<"overview" | "athletes" | "results">(initialTab);

  const tabOptions: readonly { id: typeof tab; label: string }[] = [
    { id: "overview", label: t("publicCountries.tabOverview") },
    { id: "athletes", label: t("publicCountries.tabAthletes") },
    { id: "results", label: t("publicCountries.tabResults") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTab(option.id)}
            className={cn(
              "shrink-0 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors",
              tab === option.id
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <OverviewTab profile={profile} locale={locale} />
      ) : tab === "athletes" ? (
        <AthletesTab profile={profile} />
      ) : (
        <ResultsTab profile={profile} locale={locale} />
      )}
    </div>
  );
}

function OverviewTab({ profile, locale }: { profile: CountryProfile; locale: Locale }) {
  const { t } = useI18n();
  // Championships are already loaded most-recent-first.
  const latest = profile.championships[0] ?? null;
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-foreground">{t("publicCountries.overview")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<Trophy className="size-5" aria-hidden />}
          value={profile.championshipCount}
          label={t("publicCountries.statChampionships")}
        />
        <StatTile
          icon={<Users className="size-5" aria-hidden />}
          value={profile.athleteCount}
          label={t("publicCountries.statAthletes")}
        />
        <StatTile
          icon={<Medal className="size-5" aria-hidden />}
          value={profile.bestRank !== null ? formatOrdinal(profile.bestRank, locale) : "—"}
          label={t("publicCountries.statBestFinish")}
        />
        <StatTile
          icon={<Award className="size-5" aria-hidden />}
          value={profile.podiumCount}
          label={t("publicCountries.statPodiums")}
        />
      </div>
      {latest ? (
        <Card className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <CalendarDays className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted">{t("publicCountries.statLatestChampionship")}</div>
            <div className="truncate text-base font-extrabold text-foreground">
              {championshipDisplayName(latest.name, latest.nameAr, locale)}
            </div>
            <div className="truncate text-xs text-muted">
              {formatCompetitionDateRange(latest.startDate, latest.endDate, locale)}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/** Rank/athlete/total only — the rider's total and rank both reflect the selected day or the championship overall. */
function ScopedTotalTable({
  rows,
  scope,
}: {
  rows: CountryProfile["championships"][number]["athletes"];
  scope: CountryProfileResultScope;
}) {
  const { t } = useI18n();
  const sorted = [...rows].sort((a, b) => a.byScope[scope].rank - b.byScope[scope].rank);
  return (
    <TableWrapper className="bg-surface-raised">
      <Table>
        <THead>
          <Tr>
            <ThNum className="w-12">{t("common.rank")}</ThNum>
            <Th>{t("common.athlete")}</Th>
            <ThNum>{t("common.total")}</ThNum>
          </Tr>
        </THead>
        <TBody>
          {sorted.map((row) => {
            const value = row.byScope[scope];
            return (
              <Tr key={row.riderId} className={value.rank <= 3 ? "font-medium" : undefined}>
                <TdNum>{value.rank}</TdNum>
                <Td className="font-medium">{row.name}</Td>
                <TdNum className="font-semibold">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {row.pending ? <PendingDot label={t("results.liveScore")} /> : null}
                    {value.total}
                  </span>
                </TdNum>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </TableWrapper>
  );
}

function AthletesTab({ profile }: { profile: CountryProfile }) {
  const { t } = useI18n();
  const [query, setQuery] = React.useState("");
  const [discipline, setDiscipline] = React.useState<SeriesRankingDiscipline>("ALL");

  const disciplineOptions: readonly ToggleOption<SeriesRankingDiscipline>[] = [
    { value: "ALL", label: t("rankings.allEvents") },
    { value: "LANCE", label: t("rankings.lance") },
    { value: "SWORD", label: t("rankings.sword") },
    { value: "HANGING", label: t("rankings.hangingTargets") },
  ];

  const filtered = profile.athletes.filter((athlete) => {
    if (query.trim() && !athlete.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (discipline === "LANCE" && !athlete.hasLance) return false;
    if (discipline === "SWORD" && !athlete.hasSword) return false;
    if (discipline === "HANGING" && !athlete.hasHanging) return false;
    return true;
  });

  // The selected discipline also swaps which total is shown — the combined
  // total only makes sense for "All events".
  const totalFor = (athlete: CountryProfile["athletes"][number]): string => {
    if (discipline === "LANCE") return athlete.lanceTotal;
    if (discipline === "SWORD") return athlete.swordTotal;
    if (discipline === "HANGING") return athlete.hangingTotal;
    return athlete.total;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">{t("publicCountries.participatingAthletes")}</h2>
        <StandingsToggle
          label={t("rankings.selectDiscipline")}
          value={discipline}
          options={disciplineOptions}
          onChange={setDiscipline}
        />
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("publicCountries.searchAthletePlaceholder")}
          className="w-full rounded-lg border border-border bg-surface-raised py-2 ps-9 pe-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t("publicCountries.noAthleteMatches")}</p>
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <Tr>
                <ThNum className="w-12">{t("common.rank")}</ThNum>
                <Th>{t("common.athlete")}</Th>
                <ThNum>{t("publicCountries.champsColumn")}</ThNum>
                <ThNum>{t("common.total")}</ThNum>
              </Tr>
            </THead>
            <TBody>
              {filtered.map((athlete) => (
                <Tr key={athlete.riderId} className={athlete.rank <= 3 ? "font-medium" : undefined}>
                  <TdNum>{athlete.rank}</TdNum>
                  <Td className="font-medium">{athlete.name}</Td>
                  <TdNum className="text-muted">{athlete.championshipCount}</TdNum>
                  <TdNum className="font-semibold">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {athlete.pending ? <PendingDot label={t("results.liveScore")} /> : null}
                      {totalFor(athlete)}
                    </span>
                  </TdNum>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}
    </div>
  );
}

function ResultsTab({ profile, locale }: { profile: CountryProfile; locale: Locale }) {
  const { t } = useI18n();
  const [selected, setSelected] = React.useState<string | null>(profile.championships[0]?.championshipId ?? null);
  const [scope, setScope] = React.useState<CountryProfileResultScope>("overall");
  const active = profile.championships.find((c) => c.championshipId === selected) ?? profile.championships[0];

  const scopeOptions: readonly ToggleOption<CountryProfileResultScope>[] = [
    { value: "day1", label: t("results.day1") },
    { value: "day2", label: t("results.day2") },
    { value: "day3", label: t("results.day3") },
    { value: "overall", label: t("results.overall") },
  ];

  if (!active) return null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-[999_1_560px] space-y-3">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold text-foreground">
                {championshipDisplayName(active.name, active.nameAr, locale)}
              </p>
              <p className="text-sm text-muted">
                {formatCompetitionDateRange(active.startDate, active.endDate, locale)} ·{" "}
                <bdi>{championshipDisplayName(active.location, active.locationAr, locale)}</bdi>
              </p>
            </div>
            {active.rank !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                  rankBadgeClassName(active.rank),
                )}
              >
                {t("publicCountries.overallRank", { rank: formatOrdinal(active.rank, locale) })}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-6 border-t border-border pt-3">
            <div>
              <div className="text-lg font-extrabold text-foreground">{active.athletes.length}</div>
              <div className="text-xs font-semibold text-muted">{t("publicCountries.participatingAthletes")}</div>
            </div>
            {active.teamTotal !== null ? (
              <div>
                <div className="flex items-center gap-1.5 text-lg font-extrabold text-foreground">
                  {active.pending ? <PendingDot label={t("results.liveScore")} /> : null}
                  {active.teamTotal}
                </div>
                <div className="text-xs font-semibold text-muted">{t("publicCountries.teamTotalScore")}</div>
              </div>
            ) : null}
          </div>
        </Card>

        <StandingsToggle
          label={t("results.selectScope")}
          value={scope}
          options={scopeOptions}
          onChange={setScope}
        />

        {active.athletes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("publicCountries.noAthletesInChampionship")}</p>
        ) : (
          <ScopedTotalTable rows={active.athletes} scope={scope} />
        )}

        <Link
          href={`/results/${active.slug}`}
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("publicResults.viewFullResults")}
        </Link>
      </div>

      {profile.championships.length > 1 ? (
        <div className="w-full shrink-0 space-y-2 lg:w-72">
          <p className="text-sm font-semibold text-muted">{t("publicCountries.otherChampionships")}</p>
          {profile.championships
            .filter((c) => c.championshipId !== active.championshipId)
            .map((c) => (
              <button
                key={c.championshipId}
                type="button"
                onClick={() => setSelected(c.championshipId)}
                className="block w-full rounded-lg border border-border bg-surface-raised p-3 text-start hover:border-primary"
              >
                <span className="block truncate text-sm font-semibold text-foreground">
                  {championshipDisplayName(c.name, c.nameAr, locale)}
                </span>
                <p className="mt-1 text-xs text-muted">
                  {formatCompetitionDateRange(c.startDate, c.endDate, locale)}
                </p>
                {c.rank !== null ? (
                  <span className="mt-1.5 inline-block rounded-sm bg-accent-subtle px-1.5 py-0.5 text-[0.6875rem] font-semibold text-accent">
                    {t("publicCountries.overallRank", { rank: formatOrdinal(c.rank, locale) })}
                  </span>
                ) : null}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
