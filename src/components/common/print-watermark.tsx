import Image from "next/image";

/**
 * The federation mark, faint and centered behind a printed document's whole
 * content.
 *
 * Positioned `absolute` within its nearest positioned ancestor (the print
 * page's own `<main>`, which must carry `relative`) rather than `fixed` to
 * the viewport. `fixed` reliably repeats per physical page in desktop
 * Chromium's print pipeline, but a phone's "Print" / "Save as PDF" share
 * sheet (notably iOS Safari) does not paginate the document the same way and
 * often drops fixed-position elements from the exported PDF entirely, which
 * is what made this invisible on a phone download. `absolute inset-0
 * m-auto` instead centers the mark within the full height of the document's
 * content, which every engine renders the same way regardless of how (or
 * whether) it paginates - at the cost of appearing once across the whole
 * document rather than once per physical page on a multi-page desktop
 * print.
 *
 * A negative `z-index` would tuck it behind the page's own white background
 * box instead of the content sitting on top of it - most of a printed page
 * has no table cell background to paint over it - so this sits above
 * everything at a low enough opacity to read as a watermark rather than
 * obscure the text. Only shown in the print/PDF render - `hidden
 * print:flex` - so it never appears while a page is just being read on
 * screen.
 *
 * Shows the championship's own logo when one was uploaded - it reads better
 * as the watermark on that championship's documents than the federation
 * mark - falling back to the ITPF logo otherwise, so a printed page is never
 * left without one.
 */
export function PrintWatermark({
  championshipId,
  hasChampionshipLogo,
}: {
  championshipId?: string;
  hasChampionshipLogo?: boolean;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 m-auto hidden items-center justify-center print:flex"
    >
      {hasChampionshipLogo && championshipId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/championships/${championshipId}/logo/championship`}
          alt=""
          className="h-auto w-[110mm] object-contain opacity-10"
        />
      ) : (
        <Image
          src="/brand/itpf-logo-light.webp"
          alt=""
          width={512}
          height={430}
          unoptimized
          className="h-auto w-[110mm] opacity-10"
        />
      )}
    </div>
  );
}
