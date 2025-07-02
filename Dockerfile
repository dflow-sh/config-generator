# Base image with node and Alpine
FROM node:22.12.0-alpine AS base

FROM base AS deps
# Enable corepack and prepare pnpm
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then npm install -g corepack@latest && corepack enable && corepack prepare pnpm@10.2.0 --activate && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# --- Build layer ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Optional: Pass build-time environment variables
ARG WILD_CARD_DOMAIN
ARG PROXY_SECRET

ENV WILD_CARD_DOMAIN=$WILD_CARD_DOMAIN
ENV PROXY_SECRET=$PROXY_SECRET

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && COREPACK_INTEGRITY_KEYS=0 corepack prepare pnpm@10.2.0 --activate && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# --- Runtime layer ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "./src/index.js"]

