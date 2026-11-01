"use client";

import * as React from "react";
import Link from "next/link";
import { Award, Flag, Menu, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/toolbar";
import { useI18n } from "@/lib/i18n/client";

/**
 * Below the `md` breakpoint the header's Results / Rankings / Countries
 * links, the language switcher and the theme toggle all move in here, behind
 * one menu button, rather than fighting for space in the header row.
 */
export function PublicMobileNav() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);

  const items = [
    { href: "/results", label: t("nav.publicResults"), icon: <Trophy /> },
    { href: "/rankings", label: t("rankings.title"), icon: <Award /> },
    { href: "/results/countries", label: t("publicCountries.title"), icon: <Flag /> },
  ];

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="iconSm"
        onClick={() => setOpen(true)}
        aria-label={t("nav.mainMenu")}
      >
        <Menu aria-hidden />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/60"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <nav
            aria-label={t("nav.mainMenu")}
            className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col gap-4 border-e border-border bg-surface-raised p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{t("nav.mainMenu")}</span>
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
        </div>
      ) : null}
    </div>
  );
}
