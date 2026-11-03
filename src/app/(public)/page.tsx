import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Award, ChevronRight, Flag, Trophy, Users } from "lucide-react";
import { championshipDisplayName, formatCompetitionDate } from "@/components/common/formatting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n";
import { listChampionships, type ChampionshipSummary } from "@/server/services/championships";
import { addDays, CHAMPIONSHIP_DAYS } from "@/server/services/championship-setup";
import { currentPrincipalOrNull } from "@/lib/auth/authorize";

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

/**
 * Shared by the "Latest results" and "Upcoming championships" sections: a
 * light tint of the primary color rather than a plain bordered card, so the
 * landing page's boxes the same solid color and white text as the hero's
 * "Explore" button, rather than a wall of identical white cards. Dark mode
 * keeps the existing neutral card look untouched.
 */
const TINTED_CARD =
  "border-transparent bg-primary hover:bg-primary-hover dark:border-border dark:bg-surface-raised dark:hover:bg-surface-raised";
const TINTED_TITLE = "text-primary-foreground dark:text-foreground";
const TINTED_TEXT = "text-primary-foreground/80 dark:text-muted";
/** A ghost button's default text color is invisible against a solid card, so it needs its own light/dark pair here. */
const TINTED_GHOST_BUTTON =
  "text-primary-foreground hover:bg-white/15 dark:text-foreground dark:hover:bg-surface-sunken";

function ChampionshipCard({
  championship,
  locale,
  t,
}: {
  championship: ChampionshipSummary;
  locale: Locale;
  t: Translator;
}) {
  return (
    <Card className={`h-full transition-colors ${TINTED_CARD}`}>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle className={`text-base ${TINTED_TITLE}`}>
          {championshipDisplayName(championship.name, championship.nameAr, locale)}
        </CardTitle>
        <p className={`text-sm ${TINTED_TEXT}`}>
          {formatCompetitionDate(championship.startDate, locale)} ·{" "}
          <bdi>
            {championshipDisplayName(championship.location, championship.locationAr, locale)}
          </bdi>
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/results/${championship.slug}`}>
            {t("publicResults.viewResults")}
            <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className={TINTED_GHOST_BUTTON} asChild>
          <Link href={`/results/${championship.slug}/participants`}>
            <Users aria-hidden />
            {t("publicResults.participatingCountries")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function PublicLandingPage() {
  // The admin subdomain is just a friendlier front door into the same app:
  // officials land straight on sign-in (or the dashboard, if already signed
  // in) instead of the public landing page meant for spectators.
  const host = (await headers()).get("host") ?? "";
  if (host.startsWith("admin.")) {
    const principal = await currentPrincipalOrNull();
    redirect(principal ? "/dashboard" : "/sign-in");
  }

  const { locale, t } = await getTranslator();
  const championships = await listChampionships({ publishedOnly: true });

  // Dates are plain "YYYY-MM-DD" strings, which compare correctly against
  // another ISO date string without parsing into a `Date` that could shift
  // across a time zone boundary — the same rule `formatCompetitionDate`
  // follows. A championship spans `CHAMPIONSHIP_DAYS` calendar days from its
  // start date, so "live" means today falls anywhere in that window, not
  // just on the start date itself.
  const todayIso = new Date().toISOString().slice(0, 10);
  const endDateOf = (c: ChampionshipSummary) => addDays(c.startDate, CHAMPIONSHIP_DAYS - 1);

  const live = championships.filter((c) => c.startDate <= todayIso && todayIso <= endDateOf(c));
  const upcoming = championships
    .filter((c) => c.startDate > todayIso)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);
  const latest = championships.filter((c) => todayIso > endDateOf(c)).slice(0, 3);

  return (
    <div className="space-y-14">
      {/* Minimal hero: the federation mark behind, two actions in front. Kept
          this spare deliberately — everything else lives one scroll away. */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface-raised px-6 pt-24 pb-8 text-center sm:pt-32 sm:pb-16">
        <Image
          src="/brand/itpf-horse-light.png"
          alt=""
          aria-hidden
          width={263}
          height={323}
          priority
          className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-auto -translate-x-1/2 -translate-y-1/2 opacity-25 select-none sm:h-[260px] dark:hidden"
        />
        <Image
          src="/brand/itpf-horse-dark.png"
          alt=""
          aria-hidden
          width={263}
          height={303}
          priority
          className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[200px] w-auto -translate-x-1/2 -translate-y-1/2 opacity-25 select-none sm:h-[260px] dark:block"
        />
        <div className="relative space-y-4">
          <h1 className="text-balance text-lg font-bold tracking-tight text-foreground sm:text-xl">
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

      {live.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("landing.liveChampionships")}</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {live.map((championship) => (
              <li key={championship.id}>
                <ChampionshipCard championship={championship} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("landing.upcomingChampionships")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {upcoming.map((championship) => (
              <li key={championship.id}>
                <ChampionshipCard championship={championship} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
                <ChampionshipCard championship={championship} locale={locale} t={t} />
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
              <Card className={`h-full transition-colors ${TINTED_CARD}`}>
                <CardContent className="space-y-2 pt-4">
                  <Trophy className="size-5 text-accent" aria-hidden />
                  <p className={`font-semibold ${TINTED_TITLE}`}>{t("landing.exploreResults")}</p>
                  <p className={`text-sm ${TINTED_TEXT}`}>{t("landing.exploreResultsHint")}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
          <li>
            <Link href="/rankings" className="block h-full">
              <Card className={`h-full transition-colors ${TINTED_CARD}`}>
                <CardContent className="space-y-2 pt-4">
                  <Award className="size-5 text-accent" aria-hidden />
                  <p className={`font-semibold ${TINTED_TITLE}`}>{t("landing.exploreRankings")}</p>
                  <p className={`text-sm ${TINTED_TEXT}`}>{t("landing.exploreRankingsHint")}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
          <li>
            <Link href="/results/countries" className="block h-full">
              <Card className={`h-full transition-colors ${TINTED_CARD}`}>
                <CardContent className="space-y-2 pt-4">
                  <Flag className="size-5 text-accent" aria-hidden />
                  <p className={`font-semibold ${TINTED_TITLE}`}>{t("landing.exploreCountries")}</p>
                  <p className={`text-sm ${TINTED_TEXT}`}>{t("landing.exploreCountriesHint")}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
