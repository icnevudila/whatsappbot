# Generic Node channel worker (tg/meta/shopify/...)
# Build from repo root:
#   docker build -f apps/channel-service.Dockerfile --build-arg SERVICE=tg-service -t tg-service:local .

ARG SERVICE=tg-service
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/${SERVICE} ./apps/${SERVICE}
RUN npm ci --workspace=@wa/${SERVICE} --include-workspace-root=false || npm install --workspace=@wa/${SERVICE}

FROM node:22-bookworm-slim AS runner
ARG SERVICE=tg-service
WORKDIR /app
ENV NODE_ENV=production
ENV MOCK_MODE=true
COPY --from=deps /app /app
WORKDIR /app/apps/${SERVICE}
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm","run","start"]
