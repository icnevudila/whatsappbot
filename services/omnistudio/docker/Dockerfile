FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Istanbul

# Temel paketler, Chromium, Xvfb, VNC, Node.js kurulumu
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    gnupg \
    ca-certificates \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    chromium-browser \
    chromium-chromedriver \
    fonts-liberation \
    fonts-noto-color-emoji \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 LTS Kurulumu
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Gateway ve Extension kopyalama
COPY ../gateway /app/gateway
COPY ../extension /app/extension
COPY ./entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

# Çıktı ve Profil Dizinleri
RUN mkdir -p /data/chromium-profile /app/gateway/outputs

EXPOSE 3456 6080 5900

ENTRYPOINT ["/app/entrypoint.sh"]
