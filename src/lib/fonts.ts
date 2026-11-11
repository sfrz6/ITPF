import { Cairo } from "next/font/google";

/**
 * Cairo is one typeface drawn for both scripts, rather than pairing a Latin
 * font with a separate Arabic one: the same letterforms, weight and rhythm
 * in English and Arabic, instead of the page visibly changing character
 * depending on which the visitor reads it in. Self-hosted through
 * `next/font` (not a CDN `<link>`), so there is no third-party request and
 * no font-swap flash on load.
 */
export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});
