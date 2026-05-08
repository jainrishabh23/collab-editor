# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lockfile + manifest first for layer caching
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy the WS server source
COPY ws-server ./ws-server

EXPOSE 8080

CMD ["node", "ws-server/server.mjs"]