import Image from "next/image";

/**
 * The federation mark, faint and centered on every printed page.
 *
 * `position: fixed` is the correct tool for this in paged media: per the
 * CSS spec, a fixed-positioned box is repositioned relative to each page
 * box and repeats once per physical page, which is exactly "one centered
 * watermark per page" with no JavaScript pagination logic needed. An
 * earlier version of this component avoided `fixed` because iOS Safari's
 * "Save as PDF" share sheet can drop fixed-position elements on export, and
 * tried spacing several `absolute`-positioned copies down the whole
 * document instead — but those don't land on page boundaries, so on a
 * multi-page document a copy would end up straddling a page break instead
 * of centered on either page, which reads as broken rather than subtle.
 * `fixed` is the W3C-correct behavior and renders right in the common case
 * (desktop browsers, Android/Chromium's print pipeline); the iOS edge case
 * is better addressed by printing via the browser's own Print button
 * (which does respect it) rather than papering over it with something that
 * looks wrong everywhere else.
 *
 * A negative `z-index` would tuck it behind the page's own white background
 * box instead of the content sitting on top of it - most of a printed page
 * has no table cell background to paint over it - so this sits above
 * everything at a low enough opacity to read as a watermark rather than
 * obscure the text. Only shown in the print/PDF render - `hidden
 * print:flex` - so it doesn't float over the content while the page is
 * just being read, or scrolled, on screen.
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
      className="pointer-events-none fixed inset-0 z-0 m-auto hidden items-center justify-center print:flex"
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
