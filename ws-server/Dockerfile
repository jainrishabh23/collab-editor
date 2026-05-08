# syntax=docker/dockerfile:1
# This Dockerfile expects to be built FROM THE PROJECT ROOT, not from ws-server/.
# fly.toml's [build] section will set context accordingly.

FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lockfile + manifest from project root
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies (skips devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Copy WS server source
COPY ws-server ./ws-server

EXPOSE 8080

CMD ["node", "ws-server/server.mjs"]