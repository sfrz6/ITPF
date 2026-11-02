import Image from "next/image";

/** Roughly how many compact PDF table rows fit on one printed page. */
const ROWS_PER_PAGE = 28;

/**
 * The federation mark, faint and tiled behind a printed section's content.
 *
 * Positioned `absolute` within its nearest positioned ancestor (the calling
 * section, which must carry `relative`) rather than `fixed` to the viewport.
 * `fixed` reliably repeats per physical page in desktop Chromium's print
 * pipeline, but a phone's "Print" / "Save as PDF" share sheet (notably iOS
 * Safari) does not paginate the document the same way and often drops
 * fixed-position elements from the exported PDF entirely.
 *
 * A single `absolute inset-0 m-auto` mark avoids that, but only ever shows
 * once across the whole section's height - fine for a short one, but a
 * multi-page table (an 80-row ranking, say) would then show it on only one
 * of its six printed pages. `rowCount` spaces out one mark per roughly
 * `ROWS_PER_PAGE` rows instead, evenly across the section's full height via
 * `justify-around`, so a long section still has one in view on each page it
 * spans, the same technique already used for the on-screen standings and
 * rankings tables.
 *
 * A negative `z-index` would tuck it behind the page's own white background
 * box instead of the content sitting on top of it - most of a printed page
 * has no table cell background to paint over it - so this sits above
 * everything at a low enough opacity to read as a watermark rather than
 * obscure the text.
 *
 * Rendered unconditionally (not gated behind `@media print`), unlike an
 * earlier version of this component: a phone's "Save as PDF" share sheet
 * sometimes captures the page through a path that doesn't reliably apply
 * print-only CSS, which was dropping the watermark entirely on some
 * exports even with the `absolute` positioning above. Since this component
 * is only ever used on a dedicated print/PDF page (never the normal
 * interactive UI), showing it in the on-screen preview too is harmless -
 * if anything, it's a more honest preview of what will actually print.
 *
 * Shows the championship's own logo when one was uploaded - it reads better
 * as the watermark on that championship's documents than the federation
 * mark - falling back to the ITPF logo otherwise, so a printed page is never
 * left without one.
 */
export function PrintWatermark({
  championshipId,
  hasChampionshipLogo,
  rowCount = 1,
}: {
  championshipId?: string;
  hasChampionshipLogo?: boolean;
  rowCount?: number;
}) {
  const count = Math.max(1, Math.ceil(rowCount / ROWS_PER_PAGE));

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-around"
    >
      {Array.from({ length: count }).map((_, i) =>
        hasChampionshipLogo && championshipId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={`/api/championships/${championshipId}/logo/championship`}
            alt=""
            className="h-auto w-[110mm] object-contain opacity-10"
          />
        ) : (
          <Image
            key={i}
            src="/brand/itpf-logo-light.webp"
            alt=""
            width={512}
            height={430}
            unoptimized
            className="h-auto w-[110mm] opacity-10"
          />
        ),
      )}
    </div>
  );
}
