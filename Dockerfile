# ── Stage: Base (shared) ────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache git openssh-client \
    && wget -O /tmp/gitleaks.tar.gz https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_linux_x64.tar.gz \
    && tar -xzf /tmp/gitleaks.tar.gz -C /usr/local/bin gitleaks \
    && rm /tmp/gitleaks.tar.gz \
    && chmod +x /usr/local/bin/gitleaks

RUN mkdir -p /data /tmp/repos

ENV DATABASE_URL=file:/data/secret-inspector.db

# ── Stage: Dependencies ────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# ── Stage: Dev ──────────────────────────────────────────
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD npx prisma migrate deploy && npm run dev

# ── Stage: Build ────────────────────────────────────────
FROM deps AS build
COPY . .
RUN npm run build

# ── Stage: Production ───────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
CMD npx prisma migrate deploy && node server.js
