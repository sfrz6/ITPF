/**
 * Chrome free shell for the live results board, meant to run full screen on
 * a venue TV rather than be browsed like the rest of the public site:
 * deliberately free of the shared `(public)` header/footer/nav and its
 * max-width container, same reasoning as the `(print)` and `(public-print)`
 * shells being free of the authenticated app's chrome.
 */
export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-black text-white">{children}</div>;
}
