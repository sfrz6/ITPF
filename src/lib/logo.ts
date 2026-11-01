/**
 * Shared between the client (the upload field, which checks before ever
 * sending the bytes) and the server (which re-checks, since the client can't
 * be trusted) — one source of truth for what a championship logo may be.
 */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export const ALLOWED_LOGO_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export type LogoContentType = (typeof ALLOWED_LOGO_CONTENT_TYPES)[number];
