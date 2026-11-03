"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Award, Flag, Home, Menu, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/toolbar";
import { useI18n } from "@/lib/i18n/client";

/**
 * Below the `md` breakpoint the header's Results / Rankings / Countries
 * links, the language switcher and the theme toggle all move in here, behind
 * one menu button, rather than fighting for space in the header row.
 *
 * Rendered through a portal straight onto `document.body`, not as a plain
 * `position: fixed` child of the header: the header itself is `sticky` with
 * `backdrop-blur`, and a `filter`/`backdrop-filter` ancestor becomes the
 * containing block for a `fixed` descendant in WebKit, which otherwise
 * clips and mispositions the drawer against the header's own small box
 * instead of the full viewport (visible on a real phone, not in a desktop
 * browser's viewport emulation, which doesn't reproduce the bug).
 */
export function PublicMobileNav() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);

  // Keeps the page itself from scrolling behind the drawer while it's open.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const items = [
    { href: "/", label: t("nav.home"), icon: <Home /> },
    { href: "/results", label: t("nav.publicResults"), icon: <Trophy /> },
    { href: "/rankings", label: t("rankings.title"), icon: <Award /> },
    { href: "/results/countries", label: t("publicCountries.title"), icon: <Flag /> },
  ];

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t("nav.mainMenu")}
        className="size-11 [&_svg]:size-6"
      >
        <Menu strokeWidth={2.5} aria-hidden />
      </Button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <button
                type="button"
                className="absolute inset-0 bg-ink-950/60"
                aria-label={t("common.close")}
                onClick={() => setOpen(false)}
              />
              <nav
                aria-label={t("nav.mainMenu")}
                className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col gap-4 border-e border-border bg-surface-raised p-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {t("nav.mainMenu")}
                  </span>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => setOpen(false)}
                    aria-label={t("common.close")}
                  >
                    <X aria-hidden />
                  </Button>
                </div>

                <ul className="flex-1 space-y-1">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted hover:bg-surface-sunken"
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <LocaleSwitcher />
                  <ThemeToggle />
                </div>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
