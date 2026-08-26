# syntax=docker/dockerfile:1
#
# Deliberately copies the full node_modules from the builder stage into the runner stage,
# rather than using Next.js's `output: "standalone"` file-tracing. Standalone mode is smaller
# but has known gaps around picking up Prisma's query-engine binary correctly, and that
# couldn't be verified against a real container in the environment this was built in. This
# trades some image size for a pattern that reliably includes the Prisma CLI (needed at
# startup for `prisma migrate deploy`) and every runtime dependency without guesswork.

FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next build touches every route to determine static vs. dynamic rendering; it needs
# DATABASE_URL to resolve (Prisma reads it at generate/import time) but never connects to it,
# since every page that queries the database is already forced dynamic (auth()-gated, or
# explicit `export const dynamic = 'force-dynamic'` on /catalog).
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
