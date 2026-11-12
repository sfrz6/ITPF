"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import { championshipDisplayName, formatCompetitionDateRange } from "@/components/common/formatting";
import { ItpfLogo } from "@/components/common/itpf-logo";

export interface CarouselChampionship {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly nameAr: string | null;
  readonly location: string;
  readonly locationAr: string | null;
  readonly startDate: string;
  /** Last calendar day of the championship, for the "firstDay-lastDay month year" span shown on the card. */
  readonly endDate: string;
  readonly hasChampionshipLogo: boolean;
  readonly isLive: boolean;
}

/**
 * The homepage's single most prominent call to action: the next (or
 * currently running) championship, one slide per entry. A horizontally
 * snapping scroller rather than a JS carousel library, so it costs nothing
 * extra to ship and still gets free momentum scrolling and swipe gestures on
 * a phone; the dots below just reflect which slide an `IntersectionObserver`
 * currently sees as more than half visible; clicking one scrolls there.
 *
 * A championship already live gets its own "live now" treatment per slide
 * (not a single badge for the whole section) because a multi-day event can
 * sit in this same list as a later, still-upcoming one.
 */
export function UpcomingCarousel({
  championships,
  locale,
}: {
  championships: readonly CarouselChampionship[];
  locale: Locale;
}) {
  const { t } = useI18n();
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const slideRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || championships.length <= 1) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = slideRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1) setActiveIndex(index);
        }
      },
      { root: scroller, threshold: 0.6 },
    );
    for (const slide of slideRefs.current) {
      if (slide) observer.observe(slide);
    }
    return () => observer.disconnect();
  }, [championships.length]);

  if (championships.length === 0) return null;

  // The section reads as "the upcoming championship" until the first entry's
  // date arrives, then as "the live championship" — the same per-slide
  // live/upcoming state the badge below already tracks, just surfaced once
  // more at the section level.
  const sectionTitle = championships[0]!.isLive
    ? t("landing.liveChampionships")
    : t("landing.upcomingBadge");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{sectionTitle}</h2>
        <Link
          href="/results"
          className="rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-sunken"
        >
          {t("common.viewAll")}
        </Link>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {championships.map((championship, index) => (
          <div
            key={championship.id}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            className="w-full shrink-0 snap-center px-0.5"
          >
            <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
              {/*
                 One row split in two by a diagonal divider rather than the
                 logo and the details stacked: the logo side carries a tint
                 (standing in for the template's own background photo — this
                 app has only a square logo per championship, not a
                 landscape photo, so a tinted panel holds it instead, with
                 the federation's own mark as the fallback when a
                 championship has not uploaded one yet), the details side
                 stays on the plain card background.
               */}
              <div className="relative flex items-stretch">
                <span
                  className={cn(
                    "absolute start-3 top-3 z-10 inline-flex w-fit items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                    championship.isLive
                      ? "bg-danger-subtle text-danger"
                      : "bg-surface-raised text-primary",
                  )}
                >
                  {championship.isLive ? (
                    <span className="size-1.5 rounded-full bg-danger motion-safe:animate-pulse" aria-hidden />
                  ) : (
                    <CalendarDays className="size-3" aria-hidden />
                  )}
                  {championship.isLive ? t("publicResults.statusLive") : t("landing.upcomingBadge")}
                </span>

                <div className="flex flex-1 items-center justify-center p-4 pt-10">
                  {championship.hasChampionshipLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/championships/${championship.id}/logo/championship`}
                      alt=""
                      className="size-24 object-contain"
                    />
                  ) : (
                    <ItpfLogo width={96} />
                  )}
                </div>

                {/* A plain vertical border would read as two boxes; tilting
                    it is what makes the one surface look deliberately split
                    in two rather than accidentally divided. */}
                <div aria-hidden className="w-0.5 shrink-0 -skew-x-12 bg-border-strong" />

                <div className="flex-1 space-y-1.5 p-4 pt-10">
                  <p className="truncate font-semibold text-foreground">
                    {championshipDisplayName(championship.name, championship.nameAr, locale)}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <bdi className="truncate">
                      {championshipDisplayName(championship.location, championship.locationAr, locale)}
                    </bdi>
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted">
                    <CalendarDays className="size-3 shrink-0" aria-hidden />
                    {formatCompetitionDateRange(championship.startDate, championship.endDate, locale)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 border-t border-border p-3">
                <Link
                  href={`/results/${championship.slug}/participants`}
                  className="flex-1 rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  {t("publicResults.participatingCountries")}
                </Link>
                <Link
                  href={`/results/${championship.slug}`}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  {t("landing.exploreResults")}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {championships.length > 1 ? (
        <div role="tablist" aria-label={t("landing.upcomingChampionships")} className="flex justify-center gap-1.5">
          {championships.map((championship, index) => (
            // The visible dot is small by design, but the tappable area
            // around it is padded out to a real touch target (the button's
            // box, not just the dot inside it) rather than enlarging the
            // dot itself.
            <button
              key={championship.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={championshipDisplayName(championship.name, championship.nameAr, locale)}
              onClick={() =>
                slideRefs.current[index]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
              }
              className="flex size-6 items-center justify-center"
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === activeIndex ? "w-5 bg-primary" : "w-1.5 bg-border-strong",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
