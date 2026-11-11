"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Globe, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/server/actions/preferences";

/**
 * Short form for this one compact header control only — everywhere else
 * that lists a language (the display board's own language picker, for one)
 * keeps `LOCALE_LABELS`'s full name, which reads better outside a cramped
 * header chip.
 */
const SHORT_LOCALE_LABELS: Record<Locale, string> = { en: "En", ar: "AR" };

/**
 * Cycles light, dark and system.
 *
 * The server always renders the "system" icon and label, since it has no
 * access to the visitor's stored preference. `next-themes` can resolve the
 * real theme synchronously on the client even before this component's first
 * commit, so reading `theme` unconditionally would render something other
 * than "system" on that very first paint and fail hydration. Holding the
 * display at "system" until after mount (the effect below runs post-hydration,
 * never during it) keeps that first client render byte-for-byte identical to
 * the server's, then updates to the real theme a frame later.
 */
const noopSubscribe = () => () => {};

/**
 * True only once the component has committed on the client. Modeled as an
 * external store (always "false", forever, on the server; always "true" on
 * the client) rather than a `useState` flipped from an effect, which the
 * `react-hooks/set-state-in-effect` rule flags as the cascading-render
 * anti-pattern it's meant to catch.
 */
function useHasMounted(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const mounted = useHasMounted();

  const order = ["light", "dark", "system"] as const;
  const current = (mounted ? (theme ?? "system") : "system") as (typeof order)[number];
  const next = order[(order.indexOf(current) + 1) % order.length]!;
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;
  const label =
    current === "light"
      ? t("common.themeLight")
      : current === "dark"
        ? t("common.themeDark")
        : t("common.themeSystem");

  return (
    <Button
      variant="ghost"
      size="iconSm"
      onClick={() => setTheme(next)}
      title={`${t("common.theme")}: ${label}`}
      aria-label={`${t("common.theme")}: ${label}`}
    >
      <Icon aria-hidden />
    </Button>
  );
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const [pending, startTransition] = React.useTransition();

  return (
    <label className={className}>
      <span className="sr-only">{t("common.language")}</span>
      <span className="relative inline-flex items-center">
        <Globe className="pointer-events-none absolute start-2.5 size-3.5 text-muted" aria-hidden />
        <Select
          value={locale}
          disabled={pending}
          onChange={(event) => {
            const formData = new FormData();
            formData.set("locale", event.target.value);
            startTransition(async () => {
              await setLocaleAction(formData);
            });
          }}
          className="h-8 w-auto ps-8 pe-7 text-xs"
        >
          {LOCALES.map((value) => (
            <option key={value} value={value}>
              {SHORT_LOCALE_LABELS[value]}
            </option>
          ))}
        </Select>
      </span>
    </label>
  );
}
