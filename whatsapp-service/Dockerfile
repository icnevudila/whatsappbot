# WhatsApp worker — taşınabilir paket (Playwright + Baileys).
# Build context: bu klasörün kökü (whatsapp-service/).
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/wa-service/package.json ./apps/wa-service/

RUN npm install --omit=dev --workspace @wa/service --include-workspace-root

COPY packages/shared ./packages/shared
COPY packages/sdk ./packages/sdk
COPY apps/wa-service ./apps/wa-service

ENV NODE_ENV=production
ENV PORT=8080
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
EXPOSE 8080

WORKDIR /app/apps/wa-service
RUN chmod +x scripts/entrypoint.sh
CMD ["./scripts/entrypoint.sh"]
