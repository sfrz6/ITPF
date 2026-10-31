import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { championshipDisplayName, formatCompetitionDate } from "@/components/common/formatting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surfaces";
import { getTranslator } from "@/lib/i18n/server";
import { computeSeriesRankings, getSeriesBySlug } from "@/server/services/series";
import { RankingsTable } from "./rankings-table";

/** Same cadence as a championship's own results page: see `(public)/results/[slug]/page.tsx`. */
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getTranslator();
  const series = await getSeriesBySlug(slug);
  if (!series) return { title: "Qualification rankings" };
  const name = championshipDisplayName(series.name, series.nameAr, locale);
  return {
    title: `${name} rankings`,
    description: `Combined qualification rankings for ${name}.`,
    robots: { index: true, follow: true },
  };
}

export default async function PublicSeriesRankingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale, t } = await getTranslator();

  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const rankings = await computeSeriesRankings(series.id, locale);
  if (!rankings) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/rankings"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
        {t("rankings.title")}
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {championshipDisplayName(series.name, series.nameAr, locale)}
        </h1>
        <p className="text-sm text-muted">{t("rankings.subtitle")}</p>
      </header>

      {rankings.championships.length > 0 ? (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle className="text-base">{t("rankings.championshipsInSeries")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {rankings.championships.map((championship) => (
              <Link
                key={championship.id}
                href={`/results/${championship.slug}`}
                className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:border-border-strong hover:text-primary"
              >
                {championshipDisplayName(championship.name, championship.nameAr, locale)}
                <span className="ms-1.5 text-xs text-muted">
                  {formatCompetitionDate(championship.startDate, locale)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <RankingsTable individual={rankings.individual} country={rankings.country} />

      <p className="text-xs text-muted">{t("rankings.footnote")}</p>
    </div>
  );
}
