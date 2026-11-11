import QRCode from "qrcode";

/**
 * Renders as an inline SVG string (safe to inject directly: the markup comes
 * entirely from the `qrcode` library, not from any user input) rather than a
 * data-URI `<img>`, so it stays crisp at any size a page displays it at.
 *
 * The library always emits its own fixed `width`/`height` attributes sized to
 * the module count; those are stripped here so the caller's own CSS sizing
 * on the wrapping element is what actually controls how big the code shows.
 */
export async function generateQrSvg(text: string): Promise<string> {
  const svg = await QRCode.toString(text, { type: "svg", margin: 1 });
  return svg.replace(/\s(width|height)="\d+"/g, "");
}
