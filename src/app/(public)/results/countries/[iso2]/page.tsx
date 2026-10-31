import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import { CountryFlag } from "@/components/common/country-flag";
import { championshipDisplayName, formatCompetitionDate, formatOrdinal } from "@/components/common/formatting";
import { Badge, Card } from "@/components/ui/surfaces";
import { getTranslator } from "@/lib/i18n/server";
import {
  getCountryChampionshipHistory,
  getPublicCountryByIso2,
} from "@/server/services/public-countries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iso2: string }>;
}): Promise<Metadata> {
  const { iso2 } = await params;
  const { locale } = await getTranslator();
  const country = await getPublicCountryByIso2(iso2, locale);
  if (!country) return { title: "Countries" };
  return {
    title: country.name,
    description: `ITPF championship history for ${country.name}.`,
    robots: { index: true, follow: true },
  };
}

function rankBadgeTone(rank: number): "success" | "primary" | "neutral" {
  if (rank === 1) return "success";
  if (rank <= 3) return "primary";
  return "neutral";
}

export default async function PublicCountryProfilePage({
  params,
}: {
  params: Promise<{ iso2: string }>;
}) {
  const { iso2 } = await params;
  const { locale, t } = await getTranslator();

  const country = await getPublicCountryByIso2(iso2, locale);
  if (!country) notFound();

  const history = await getCountryChampionshipHistory(country.id, locale);
  if (history.length === 0) notFound();

  const mostRecent = history[0]!;

  return (
    <div className="space-y-6">
      <Link
        href="/results/countries"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
        {t("publicCountries.allCountries")}
      </Link>

      <header className="flex items-center gap-4">
        <CountryFlag iso2={country.iso2} name={country.name} size="lg" className="h-10 w-14" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{country.name}</h1>
          <p className="text-sm text-muted">
            {t("publicCountries.championshipsCount", { count: history.length })} ·{" "}
            {t("publicCountries.mostRecently", {
              date: formatCompetitionDate(mostRecent.startDate, locale),
            })}
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t("publicCountries.championshipHistory")}</h2>
        <ul className="space-y-3">
          {history.map((entry) => (
            <li key={entry.championshipId}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {championshipDisplayName(entry.name, entry.nameAr, locale)}
                  </p>
                  <p className="text-sm text-muted">
                    {formatCompetitionDate(entry.startDate, locale)} · <bdi>{entry.location}</bdi>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {entry.rank !== null ? (
                    <Badge tone={rankBadgeTone(entry.rank)}>
                      {t("publicCountries.overallRank", { rank: formatOrdinal(entry.rank, locale) })}
                    </Badge>
                  ) : null}
                  <Link
                    href={`/results/${entry.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t("publicResults.viewResults")}
                  </Link>
                  <Link
                    href={`/results/${entry.slug}/participants`}
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                  >
                    <Users className="size-3.5" aria-hidden />
                    {t("publicResults.participatingCountries")}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
