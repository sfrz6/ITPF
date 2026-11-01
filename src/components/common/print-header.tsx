import type * as React from "react";
import { ItpfLogoPrint } from "./itpf-logo";

/**
 * The header shared by every printed document: the federation's own mark on
 * the start side, and — opposite it, never crowding the title or location
 * text next to the federation mark — whichever of the organizer's and the
 * championship's own logos were uploaded for this championship. Either, both
 * or neither can be set, so each is rendered only when it exists, side by
 * side, sized to sit comfortably above the document's own right-aligned
 * heading rather than risk running into it.
 */
export function PrintHeader({
  federationLabel,
  championshipName,
  locationLine,
  championshipId,
  hasOrganizerLogo,
  hasChampionshipLogo,
  right,
}: {
  federationLabel: string;
  championshipName: React.ReactNode;
  locationLine: React.ReactNode;
  championshipId: string;
  hasOrganizerLogo: boolean;
  hasChampionshipLogo: boolean;
  right: React.ReactNode;
}) {
  const showLogos = hasOrganizerLogo || hasChampionshipLogo;

  return (
    <header className="mb-4 flex items-start justify-between gap-6 border-b-2 border-black pb-3">
      <div className="flex items-start gap-4">
        <ItpfLogoPrint width={96} />
        <div>
          <p className="text-[10pt] font-semibold uppercase tracking-wide">{federationLabel}</p>
          <h1 className="mt-0.5 text-[14pt] font-bold leading-tight">{championshipName}</h1>
          <p className="text-[9pt]">{locationLine}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        {showLogos ? (
          <div className="flex items-center gap-2">
            {hasChampionshipLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/championships/${championshipId}/logo/championship`}
                alt=""
                className="h-10 max-w-28 shrink-0 object-contain"
              />
            ) : null}
            {hasOrganizerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/championships/${championshipId}/logo/organizer`}
                alt=""
                className="h-10 max-w-28 shrink-0 object-contain"
              />
            ) : null}
          </div>
        ) : null}
        <div className="text-end text-[9pt]">{right}</div>
      </div>
    </header>
  );
}
