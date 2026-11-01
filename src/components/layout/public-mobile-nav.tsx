"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

/**
 * The public header's Results / Rankings / Countries links collapse into
 * this menu below the `md` breakpoint, instead of disappearing with nothing
 * to replace them (what a narrow phone saw before this existed).
 */
export function PublicMobileNav() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);

  const items = [
    { href: "/results", label: t("nav.publicResults") },
    { href: "/rankings", label: t("rankings.title") },
    { href: "/results/countries", label: t("publicCountries.title") },
  ];

  return (
    <div className="relative md:hidden">
      <Button
        variant="ghost"
        size="iconSm"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("nav.mainMenu")}
        aria-expanded={open}
      >
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </Button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <nav
            aria-label={t("nav.mainMenu")}
            className="absolute end-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-surface-raised p-1 shadow-lg"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-sunken",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      ) : null}
    </div>
  );
}
