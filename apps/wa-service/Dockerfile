# WhatsApp servisi + Playwright Chromium (iletişim scraper).
# Playwright image: tarayıcı + sistem bağımlılıkları hazır.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

# Monorepo manifestleri once kopyalanir ki bagimlilik katmani onbelleklenebilsin.
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/wa-service/package.json ./apps/wa-service/

RUN npm ci --omit=dev --workspace @wa/service --include-workspace-root

COPY packages/shared ./packages/shared
COPY apps/wa-service ./apps/wa-service

ENV NODE_ENV=production
ENV PORT=8080
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
EXPOSE 8080

# tsx dev bagimliligi oldugu icin uretimde de gerekli: kaynak TypeScript
# dogrudan calistiriliyor, ayri bir derleme adimi yok.
RUN npm install --no-save tsx@4.23.13

# Opsiyonel: scaler icin docker CLI (build-arg INSTALL_DOCKER_CLI=true)
ARG INSTALL_DOCKER_CLI=false
RUN if [ "$INSTALL_DOCKER_CLI" = "true" ]; then \
      apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
      && curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-27.1.1.tgz \
        | tar -xz -C /usr/local/bin --strip-components=1 docker/docker \
      && rm -rf /var/lib/apt/lists/*; \
    fi

# SIGTERM'in Node'a ulasmasi sart: kapanis sirasi (creds flush -> sock.end ->
# kira birak) buna bagli. Shell formu kullanilmiyor ki sinyal yutulmasin.
WORKDIR /app/apps/wa-service
RUN chmod +x scripts/entrypoint.sh
# --env-file-if-exists: konteynerde .env olmayabilir, degiskenler docker
# tarafindan veriliyor olabilir. Dosya yoksa hata vermeden devam eder.
# WORKER_ID=auto / bos ise entrypoint hostname'den uretir (compose --scale).
CMD ["./scripts/entrypoint.sh"]
