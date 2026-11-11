"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { CountryLabel } from "@/components/common/country-flag";
import { Card } from "@/components/ui/surfaces";

export interface CountryDirectoryEntry {
  readonly id: string;
  readonly iso2: string;
  readonly name: string;
  readonly href: string;
  readonly countLabel: string;
}

/**
 * The countries and riders directories both list every country that has
 * taken part in a published championship, which is already past twenty
 * entries in production. A client-side filter keeps the whole list
 * reachable on a phone without a long scroll, while staying a plain
 * substring match against data the server already sent, so it works without
 * a round trip and needs no server-side search endpoint.
 */
export function CountryDirectory({
  entries,
  searchLabel,
  searchPlaceholder,
  noMatchesLabel,
}: {
  entries: readonly CountryDirectoryEntry[];
  searchLabel: string;
  searchPlaceholder: string;
  noMatchesLabel: string;
}) {
  const [query, setQuery] = React.useState("");

  const normalized = query.trim().toLocaleLowerCase();
  const filtered = normalized
    ? entries.filter(
        (entry) =>
          entry.name.toLocaleLowerCase().includes(normalized) ||
          // The ISO 3166-1 alpha-2 code is only ever 2 letters, so it can
          // only ever match a short query against its own start (typing "sa"
          // should find Saudi Arabia by code; the reverse direction, "does
          // the 2-letter code contain this longer query", can never be true).
          entry.iso2.toLocaleLowerCase().startsWith(normalized),
      )
    : entries;

  return (
    <div className="space-y-4">
      {entries.length > 8 ? (
        <label className="relative block">
          <span className="sr-only">{searchLabel}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-md border border-border-strong bg-surface-raised ps-9 pe-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </label>
      ) : null}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{noMatchesLabel}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <Link href={entry.href} className="block h-full">
                <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-border-strong">
                  <CountryLabel iso2={entry.iso2} name={entry.name} size="lg" />
                  <span className="ms-auto shrink-0 text-xs text-muted">{entry.countLabel}</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
