# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

# ---------------------------------------------------------------------------
# deps: full dependency install, reused by both the build and the migrator
# ---------------------------------------------------------------------------
FROM base AS deps
# Pinned to the exact npm version the lockfile was generated with: even
# newer npm 11.x patch releases resolve optional native-binding peer deps
# (lightningcss/tailwind oxide platform variants) differently, and `npm ci`
# then rejects the lockfile as "out of sync" over that, not an actual
# package.json mismatch.
RUN npm install -g npm@11.6.2
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder: compiles the Next.js standalone server bundle
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# runner: the production app, pruned to just the standalone server output.
# Migrations run separately (see the `migrator` stage) because the
# standalone bundle only carries production dependencies, not tsx/drizzle-kit.
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# migrator: full source + full node_modules (tsx included), used as a one-off
# `docker compose run` for `db:migrate`, `db:seed`, `db:bootstrap-admin` —
# never run as a long-lived service.
# ---------------------------------------------------------------------------
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "db:migrate"]
