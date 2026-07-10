# Corrix CAP provider — always-on WebSocket worker for Fly.io
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/provider/package.json ./apps/provider/
COPY packages/core/package.json ./packages/core/

# Full install so tsx (runtime) is available
RUN npm install --workspace=@corrix/provider --workspace=@corrix/core --include-workspace-root

COPY packages/core ./packages/core
COPY apps/provider ./apps/provider

ENV NODE_ENV=production
ENV PORT=8080
# Cap V8 heap so the process stays under machine RAM (see fly.toml memory)
ENV NODE_OPTIONS=--max-old-space-size=384

# Single process: health HTTP + CAP provider (fly-start imports provider, no child)
CMD ["npx", "tsx", "apps/provider/src/fly-start.ts"]
