# WhatsApp servisi. Kalici process gerektiriyor, bu yuzden VPS'te calisir.
FROM node:22-alpine

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
EXPOSE 8080

# tsx dev bagimliligi oldugu icin uretimde de gerekli: kaynak TypeScript
# dogrudan calistiriliyor, ayri bir derleme adimi yok.
RUN npm install --no-save tsx@4.23.13

# SIGTERM'in Node'a ulasmasi sart: kapanis sirasi (creds flush -> sock.end ->
# kira birak) buna bagli. Shell formu kullanilmiyor ki sinyal yutulmasin.
WORKDIR /app/apps/wa-service
CMD ["node", "--import", "tsx", "src/index.ts"]
