import Image from "next/image";

/**
 * The federation mark, faint and centered on every printed page.
 *
 * `position: fixed` repeats the same element on each sheet when the browser
 * paginates for print (the engine every print route here is built against).
 * A negative `z-index` would tuck it behind the page's own white background
 * box instead of the content sitting on top of it — most of a printed page
 * has no table cell background to paint over it — so this sits above
 * everything at a low enough opacity to read as a watermark rather than
 * obscure the text. Only shown in the print/PDF render — `hidden
 * print:flex` — so it never appears while a page is just being read on
 * screen.
 */
export function PrintWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 hidden items-center justify-center print:flex"
    >
      <Image
        src="/brand/itpf-logo-light.webp"
        alt=""
        width={512}
        height={430}
        unoptimized
        className="h-auto w-[110mm] opacity-10"
      />
    </div>
  );
}
