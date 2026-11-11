import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Award, ChevronRight, Flag, Trophy, Users } from "lucide-react";
import { championshipDisplayName } from "@/components/common/formatting";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surfaces";
import { getTranslator } from "@/lib/i18n/server";
import { listChampionships, type ChampionshipSummary } from "@/server/services/championships";
import { addDays, CHAMPIONSHIP_DAYS } from "@/server/services/championship-setup";
import { listPublishedSeries } from "@/server/services/series";
import { currentPrincipalOrNull } from "@/lib/auth/authorize";
import { UpcomingCarousel } from "@/components/public/upcoming-carousel";
import { LatestResultCard } from "@/components/public/latest-result-card";

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

const QUICK_LINKS = [
  { href: "/results/riders", labelKey: "publicRiders.title", icon: Users },
  { href: "/results/countries", labelKey: "landing.exploreCountries", icon: Flag },
  { href: "/rankings", labelKey: "landing.exploreRankings", icon: Award },
  { href: "/results", labelKey: "landing.exploreResults", icon: Trophy },
] as const;

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
  const [championships, series] = await Promise.all([
    listChampionships({ publishedOnly: true }),
    listPublishedSeries(),
  ]);

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
    .slice(0, 4);

  // Live first (a visitor who opens this during an event should see it
  // before anything still to come), then upcoming in date order. A
  // championship already in `live` is, by construction, not in `upcoming`
  // too (the date ranges that define each are mutually exclusive), so this
  // never shows the same event twice.
  const carouselChampionships = [
    ...live.map((c) => ({ ...c, isLive: true })),
    ...upcoming.map((c) => ({ ...c, isLive: false })),
  ];

  // Each latest-result card carries its own top-3 country standings, so it
  // takes real vertical room. One is enough when the carousel above it
  // already anchors the page, but with no live or upcoming championship to
  // show there, "latest results" becomes the page's own headline content and
  // gets a second one.
  const latest = championships
    .filter((c) => todayIso > endDateOf(c))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, carouselChampionships.length === 0 ? 2 : 1);

  return (
    <div className="space-y-10">
      {/*
       * A single full-bleed photo at every width (not a different crop per
       * breakpoint): the empty space on its physical right holds the title
       * and subtitle, in the same right-anchored column at every size and
       * regardless of locale (see the physical, not logical, classes below).
       *
       * Edge to edge on a phone (cancels `<main>`'s own top and side padding
       * with negative margins, and drops the rounded corners/border that
       * would otherwise frame it, so the photo starts right under the
       * header with no gap) — from `sm` up it sits back inside the normal
       * contained, bordered card like every other section.
       */}
      <section className="relative -mx-4 -mt-6 overflow-hidden bg-ink-950 sm:mx-0 sm:mt-0 sm:rounded-2xl sm:border sm:border-border">
        <div className="relative aspect-[3/2] max-h-[26rem] w-full sm:aspect-[16/7] lg:aspect-[21/8]">
          <Image
            src="/brand/hero-tent-pegging.webp"
            alt=""
            aria-hidden
            fill
            priority
            sizes="(min-width: 1024px) 976px, (min-width: 640px) calc(100vw - 48px), 100vw"
            className="object-cover object-[30%_35%] sm:object-[0%_50%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ink-950/50 to-ink-950/85" />
          <div className="absolute inset-0 flex items-center justify-end p-5 text-right rtl:justify-start sm:p-8 lg:p-14">
            <div className="max-w-[80%] sm:max-w-sm lg:max-w-md">
              {/* The gold accent bar flags the headline the way the
                  federation's own gold ramp already flags a podium rank —
                  reusing that same semantic token rather than a one-off
                  color. Both lines are their own strings (not one string
                  left to `text-balance`), so the break falls in the same
                  place at every breakpoint instead of drifting on a
                  narrower phone. */}
              <div className="relative pr-4">
                <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm sm:text-2xl lg:text-4xl">
                  {t("landing.titleLine1")}
                  <br />
                  {t("landing.titleLine2")}
                </h1>
                <span aria-hidden className="absolute inset-y-0 right-0 w-1 rounded-full bg-accent" />
              </div>
              <p className="mt-2 text-xs text-white/80 drop-shadow-sm sm:mt-3 sm:text-sm lg:text-lg">
                {t("landing.subtitle")}
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-2 rtl:justify-start sm:gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full sm:h-11 sm:px-6 sm:text-base sm:[&_svg]:size-5"
                  asChild
                >
                  <Link href="/results">
                    {t("landing.heroPrimary")}
                    <ChevronRight className="rtl:rotate-180" aria-hidden />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/25 text-white hover:bg-white/10 sm:h-11 sm:px-6 sm:text-base"
                  asChild
                >
                  <a href="https://itpf.net" target="_blank" rel="noopener noreferrer">
                    {t("landing.aboutUs")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <UpcomingCarousel championships={carouselChampionships} locale={locale} />

      <section className="grid grid-cols-4 gap-2 sm:gap-3">
        {QUICK_LINKS.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-raised px-2 py-4 text-center transition-colors hover:border-border-strong"
          >
            <Icon className="size-6 text-accent" aria-hidden />
            <span className="text-xs font-medium text-foreground">{t(labelKey)}</span>
          </Link>
        ))}
      </section>

      {latest.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t("landing.latestResults")}</h2>
            <Link
              href="/results"
              className="rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-sunken"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <ul className="space-y-3">
            {latest.map((championship) => (
              <li key={championship.id}>
                <LatestResultCard championship={championship} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {series.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t("landing.topRankings")}</h2>
            <Link
              href="/rankings"
              className="rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-sunken"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <ul className="space-y-3">
            {series.map((item) => (
              <li key={item.id}>
                <Link href={`/rankings/${item.slug}`} className="block">
                  <Card className="flex items-center gap-3 p-4 transition-colors hover:border-border-strong">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
                      <Award className="size-5 text-accent" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        {championshipDisplayName(item.name, item.nameAr, locale)}
                      </p>
                      <p className="text-xs text-muted">
                        {t("series.championshipsCount", { count: item.championshipCount })}
                      </p>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
