"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, Home, MoreHorizontal, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";

/**
 * Primary mobile navigation: the four destinations a visitor reaches for
 * most, always one tap away, plus a "More" tab for everything else
 * (rankings, language, theme — see `MobileNavDrawer`). Hidden from `md` up,
 * where the header's own nav already lists every destination.
 *
 * Fixed to the viewport bottom rather than the document, and padded for the
 * device's safe area, so it clears a phone's home indicator instead of
 * sitting on top of it.
 */
export function PublicBottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreTriggerRef = React.useRef<HTMLButtonElement>(null);

  const items = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/results", label: t("nav.championshipsShort"), icon: Trophy },
    { href: "/results/countries", label: t("publicCountries.title"), icon: Flag },
    { href: "/results/riders", label: t("publicRiders.title"), icon: Users },
  ] as const;

  return (
    <nav
      aria-label={t("nav.mainMenu")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-5">
        {items.map((item) => {
          // The home route only matches exactly ("/" is a prefix of every
          // other route), everything else matches its own subtree so a
          // country or championship detail page still highlights its tab.
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium transition-colors [&_svg]:size-5",
                active ? "text-primary" : "text-muted hover:text-foreground",
              )}
            >
              <Icon aria-hidden />
              {item.label}
            </Link>
          );
        })}
        <button
          ref={moreTriggerRef}
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label={t("common.more")}
          aria-expanded={moreOpen}
          className="flex flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium text-muted transition-colors hover:text-foreground [&_svg]:size-5"
        >
          <MoreHorizontal aria-hidden />
          {t("common.more")}
        </button>
      </div>

      <MobileNavDrawer
        open={moreOpen}
        onClose={() => {
          setMoreOpen(false);
          moreTriggerRef.current?.focus();
        }}
      />
    </nav>
  );
}
