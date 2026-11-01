import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { championships } from "@/db/schema";

/**
 * Serves a championship's organizer or championship logo straight from the
 * database. Public and unauthenticated like the flag SVGs under `public/`:
 * a logo is decorative, never sensitive, and the public results pages need
 * to load it without a session.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ championshipId: string; kind: string }> },
) {
  const { championshipId, kind } = await params;
  if (kind !== "championship" && kind !== "organizer") {
    return new Response(null, { status: 404 });
  }

  const db = getDb();
  const [row] = await db
    .select(
      kind === "championship"
        ? {
            data: championships.championshipLogo,
            contentType: championships.championshipLogoContentType,
          }
        : {
            data: championships.organizerLogo,
            contentType: championships.organizerLogoContentType,
          },
    )
    .from(championships)
    .where(eq(championships.id, championshipId))
    .limit(1);

  if (!row?.data || !row.contentType) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
