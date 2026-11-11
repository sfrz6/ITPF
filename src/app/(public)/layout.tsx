import type { Metadata } from "next";
import Link from "next/link";
import { ItpfLogo } from "@/components/common/itpf-logo";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/toolbar";
import { PublicBottomNav } from "@/components/layout/public-bottom-nav";
import { PublicMobileNav } from "@/components/layout/public-mobile-nav";
import { getTranslator } from "@/lib/i18n/server";

/**
 * Overrides the root app's manifest (start_url "/dashboard", the sign-in-gated
 * dashboard) with one whose start_url is the public landing page, so a
 * visitor who adds this section to their home screen launches back into the
 * public site instead of the officials' sign-in page.
 */
export const metadata: Metadata = {
  manifest: "/manifest-public.webmanifest",
};

/**
 * Shell for the public site: the landing page and the published results,
 * rankings and countries pages beneath it.
 *
 * Deliberately free of any authentication call: a spectator, a journalist or a
 * federation officer reads these pages without an account, so the shell offers
 * nothing but the federation identity, a shared nav, the language choice and
 * the theme. Every public page shares this one header, so a visitor can always
 * move between the landing page, results, rankings and countries.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getTranslator();

  return (
    <div className="flex min-h-dvh flex-col">
      {/*
       * Visually hidden until it receives keyboard focus, so a keyboard or
       * screen reader visitor can jump straight past the header's five nav
       * links and two toolbar controls on every single page, rather than
       * tabbing through all of them first.
       */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        {t("nav.skipToContent")}
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md">
            <ItpfLogo width={40} priority />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {t("common.appNameShort")}
              </span>
              <span className="block truncate text-[0.6875rem] text-muted">
                {t("common.federation")}
              </span>
            </span>
          </Link>
          <nav className="ms-auto hidden items-center gap-5 text-sm font-medium text-muted md:flex">
            <Link href="/" className="hover:text-foreground">
              {t("nav.home")}
            </Link>
            <Link href="/results" className="hover:text-foreground">
              {t("nav.publicResults")}
            </Link>
            <Link href="/rankings" className="hover:text-foreground">
              {t("rankings.title")}
            </Link>
            <Link href="/results/countries" className="hover:text-foreground">
              {t("publicCountries.title")}
            </Link>
            <Link href="/results/riders" className="hover:text-foreground">
              {t("publicRiders.title")}
            </Link>
          </nav>
          <div className="hidden shrink-0 items-center gap-1 md:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <div className="ms-auto shrink-0 md:hidden">
            <PublicMobileNav />
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>

      {/*
       * The fixed bottom tab bar below `md` sits on top of whatever
       * scrolls to the very end of the page, so the footer needs extra
       * bottom padding (its own height plus the device's safe area) to
       * clear it rather than being hidden underneath it.
       */}
      <footer className="border-t border-border pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-5">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1 px-4 text-center text-xs text-muted sm:px-6">
          <p>{t("common.federation")}</p>
          <a
            href="https://itpf.net"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("landing.aboutUs")}
          </a>
        </div>
      </footer>

      <PublicBottomNav />
    </div>
  );
}
