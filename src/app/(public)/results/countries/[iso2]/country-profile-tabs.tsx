"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, Medal, Search, Trophy, Users } from "lucide-react";
import {
  championshipDisplayName,
  formatCompetitionDateRange,
  formatNumericDate,
  formatOrdinal,
} from "@/components/common/formatting";
import { cn } from "@/lib/cn";
import { Badge, Card } from "@/components/ui/surfaces";
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
  countryName,
  profile,
}: {
  countryName: string;
  profile: CountryProfile;
}) {
  const { t, locale } = useI18n();
  // The Athletes directory links straight into this tab (`?tab=athletes`)
  // rather than its own separate page now that the two are merged.
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "athletes" ? "athletes" : "overview";
  const [tab, setTab] = React.useState<"overview" | "history" | "athletes" | "results">(initialTab);

  const tabOptions: readonly { id: typeof tab; label: string }[] = [
    { id: "overview", label: t("publicCountries.tabOverview") },
    { id: "history", label: t("publicCountries.tabHistory") },
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
      ) : tab === "history" ? (
        <HistoryTab countryName={countryName} profile={profile} locale={locale} />
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
          icon={<CalendarDays className="size-5" aria-hidden />}
          value={
            profile.latestChampionshipDate
              ? formatNumericDate(profile.latestChampionshipDate)
              : "—"
          }
          label={t("publicCountries.statLatestChampionship")}
        />
      </div>
    </div>
  );
}

function HistoryTab({
  countryName,
  profile,
  locale,
}: {
  countryName: string;
  profile: CountryProfile;
  locale: Locale;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = React.useState<string | null>(profile.championships[0]?.championshipId ?? null);
  const [scope, setScope] = React.useState<CountryProfileResultScope>("overall");

  const scopeOptions: readonly ToggleOption<CountryProfileResultScope>[] = [
    { value: "day1", label: t("results.day1") },
    { value: "day2", label: t("results.day2") },
    { value: "day3", label: t("results.day3") },
    { value: "overall", label: t("results.overall") },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-foreground">{t("publicCountries.championshipHistory")}</h2>
      <ul className="space-y-3">
        {profile.championships.map((championship) => {
          const isExpanded = expanded === championship.championshipId;
          return (
            <li key={championship.championshipId}>
              <Card className="overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {championshipDisplayName(championship.name, championship.nameAr, locale)}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
                      <span>{formatCompetitionDateRange(championship.startDate, championship.endDate, locale)}</span>
                      <span>·</span>
                      <bdi>{championshipDisplayName(championship.location, championship.locationAr, locale)}</bdi>
                      <span>·</span>
                      <span>{t("publicResults.countriesCount", { count: championship.countryCount })}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {championship.pending ? <PendingDot label={t("results.liveScore")} /> : null}
                    {championship.rank !== null ? (
                      championship.rank <= 3 ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                            rankBadgeClassName(championship.rank),
                          )}
                        >
                          {t("publicCountries.overallRank", { rank: formatOrdinal(championship.rank, locale) })}
                        </span>
                      ) : (
                        <Badge tone="neutral">
                          {t("publicCountries.overallRank", { rank: formatOrdinal(championship.rank, locale) })}
                        </Badge>
                      )
                    ) : null}
                    <Link
                      href={`/results/${championship.slug}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t("publicResults.viewResults")}
                    </Link>
                    <Link
                      href={`/results/${championship.slug}/participants`}
                      className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                    >
                      <Users className="size-3.5" aria-hidden />
                      {t("publicResults.participatingCountries")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : championship.championshipId)}
                      aria-expanded={isExpanded}
                      aria-label={t("publicCountries.athletesInThisChampionship", { country: countryName })}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:bg-surface-sunken"
                    >
                      <ChevronDown
                        className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                        aria-hidden
                      />
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-border bg-surface-sunken p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {t("publicCountries.athletesInThisChampionship", { country: countryName })}
                      </p>
                      <StandingsToggle
                        label={t("results.selectScope")}
                        value={scope}
                        options={scopeOptions}
                        onChange={setScope}
                      />
                    </div>
                    {championship.athletes.length === 0 ? (
                      <p className="text-sm text-muted">{t("publicCountries.noAthletesInChampionship")}</p>
                    ) : (
                      <ScopedTotalTable rows={championship.athletes} scope={scope} />
                    )}
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
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
                      {athlete.total}
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
