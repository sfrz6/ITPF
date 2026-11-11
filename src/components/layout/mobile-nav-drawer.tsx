"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Award, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher, ThemeToggle } from "@/components/layout/toolbar";
import { useI18n } from "@/lib/i18n/client";

/**
 * The slide-in panel shared by the header's hamburger button and the bottom
 * tab bar's "More" tab (see `PublicMobileNav` and `PublicBottomNav`): same
 * panel, two different openers, each managing its own open state and its own
 * focus restoration on close.
 *
 * Rendered through a portal straight onto `document.body`, not as a plain
 * `position: fixed` child of the header: the header itself is `sticky` with
 * `backdrop-blur`, and a `filter`/`backdrop-filter` ancestor becomes the
 * containing block for a `fixed` descendant in WebKit, which otherwise
 * clips and mispositions the drawer against the header's own small box
 * instead of the full viewport (visible on a real phone, not in a desktop
 * browser's viewport emulation, which doesn't reproduce the bug).
 *
 * Rankings is the only destination here that isn't already one tap away on
 * the bottom tab bar (Home, Championships, Teams and Athletes all are), so
 * the drawer stays short: that one link, plus the language and theme
 * controls the bottom bar has no room for.
 */
export function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const panelRef = React.useRef<HTMLElement>(null);

  // Keeps the page itself from scrolling behind the drawer while it's open,
  // and moves focus into it (a screen reader or keyboard user otherwise
  // stays anchored on the now-hidden trigger button).
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeButton = panelRef.current?.querySelector<HTMLElement>("button");
    closeButton?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes the drawer, and Tab is trapped inside it while it's open,
  // matching the standard dialog keyboard pattern.
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-ink-950/60"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <nav
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.mainMenu")}
        className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col gap-4 border-e border-border bg-surface-raised p-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{t("nav.mainMenu")}</span>
          <Button variant="ghost" size="iconSm" onClick={onClose} aria-label={t("common.close")}>
            <X aria-hidden />
          </Button>
        </div>

        <ul className="space-y-1">
          <li>
            <Link
              href="/rankings"
              onClick={onClose}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted hover:bg-surface-sunken"
            >
              <Award aria-hidden />
              {t("rankings.title")}
            </Link>
          </li>
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </div>,
    document.body,
  );
}
