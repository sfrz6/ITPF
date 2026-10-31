import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Award, ChevronRight, Flag, Trophy } from "lucide-react";
import { championshipDisplayName, formatCompetitionDate } from "@/components/common/formatting";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";
import { listChampionships } from "@/server/services/championships";

/**
 * Standings change only when an official confirms a run, and this page is
 * read far more often than that happens. See `(public)/results/page.tsx`.
 */
export const revalidate = 30;

export const metadata: Metadata = {
  title: "ITPF Competition System",
  description:
    "Official results, qualification rankings and country records of the International Tent Pegging Federation.",
  robots: { index: true, follow: true },
};

export default async function PublicLandingPage() {
  const { locale, t } = await getTranslator();
  const championships = await listChampionships({ publishedOnly: true });
  const latest = championships.slice(0, 3);

  return (
    <div className="space-y-14">
      {/* Minimal hero: the federation mark behind, two actions in front. Kept
          this spare deliberately — everything else lives one scroll away. */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface-raised px-6 py-16 text-center sm:py-24">
        <Image
          src="/brand/itpf-horse-light.png"
          alt=""
          aria-hidden
          width={263}
          height={424}
          priority
          className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[280px] -translate-x-1/2 -translate-y-1/2 opacity-10 select-none sm:w-[380px] dark:hidden"
        />
        <Image
          src="/brand/itpf-horse-dark.png"
          alt=""
          aria-hidden
          width={263}
          height={420}
          priority
          className="pointer-events-none absolute left-1/2 top-1/2 hidden h-auto w-[280px] -translate-x-1/2 -translate-y-1/2 opacity-10 select-none sm:w-[380px] dark:block"
        />
        <div className="relative space-y-7">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("landing.title")}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" size="lg" asChild>
              <a href="https://itpf.net" target="_blank" rel="noopener noreferrer">
                {t("landing.aboutUs")}
              </a>
            </Button>
            <Button variant="primary" size="lg" asChild>
              <a href="#explore">
                {t("landing.explore")}
                <ChevronRight className="rtl:rotate-180" aria-hidden />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {latest.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t("landing.latestResults")}</h2>
            <Link href="/results" className="text-sm font-medium text-primary hover:underline">
              {t("landing.allResults")}
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {latest.map((championship) => (
              <li key={championship.id}>
                <Link href={`/results/${championship.slug}`} className="block h-full">
                  <Card className="h-full transition-colors hover:border-border-strong">
                    <CardHeader className="flex-col items-start gap-1">
                      <CardTitle className="text-base">
                        {championshipDisplayName(championship.name, championship.nameAr, locale)}
                      </CardTitle>
                      <p className="text-sm text-muted">
                        {formatCompetitionDate(championship.startDate, locale)} ·{" "}
                        <bdi>{championship.location}</bdi>
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Badge tone="success">{t("runs.statusConfirmed")}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="explore" className="scroll-mt-20 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t("landing.explore")}</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          <li>
            <Link href="/results" className="block h-full">
              <Card className="h-full transition-colors hover:border-border-strong">
                <CardContent className="space-y-2 pt-4">
                  <Trophy className="size-5 text-accent" aria-hidden />
                  <p className="font-semibold text-foreground">{t("landing.exploreResults")}</p>
                  <p className="text-sm text-muted">{t("landing.exploreResultsHint")}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
          <li>
            <Link href="/rankings" className="block h-full">
              <Card className="h-full transition-colors hover:border-border-strong">
                <CardContent className="space-y-2 pt-4">
                  <Award className="size-5 text-accent" aria-hidden />
                  <p className="font-semibold text-foreground">{t("landing.exploreRankings")}</p>
                  <p className="text-sm text-muted">{t("landing.exploreRankingsHint")}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
          <li>
            <Link href="/results/countries" className="block h-full">
              <Card className="h-full transition-colors hover:border-border-strong">
                <CardContent className="space-y-2 pt-4">
                  <Flag className="size-5 text-accent" aria-hidden />
                  <p className="font-semibold text-foreground">{t("landing.exploreCountries")}</p>
                  <p className="text-sm text-muted">{t("landing.exploreCountriesHint")}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
