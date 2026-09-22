# GFlow Engine — Isolated Flow Video Generation Service
# Internal-only: NO public port exposure. Only reachable via Docker internal network.
# Pinned upstream: gflow-cli v0.79.1

FROM python:3.11-slim-bookworm

# System dependencies for headless Chrome and video processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnspr4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    xvfb \
    ca-certificates \
    curl \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY services/gflow-engine/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install Google Chrome for Playwright 'chrome' channel symmetry
RUN curl -fsSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb \
    && apt-get update && apt-get install -y --no-install-recommends /tmp/chrome.deb \
    && rm /tmp/chrome.deb && rm -rf /var/lib/apt/lists/*

# Clone pinned gflow-cli v0.79.1
RUN git clone --depth 1 --branch v0.79.1 \
    https://github.com/ffroliva/gflow-cli.git /app/upstream_gflow/gflow-cli \
    && pip install --no-cache-dir -e /app/upstream_gflow/gflow-cli

# Copy central launch configuration
COPY services/gflow-engine/sitecustomize.py /usr/local/lib/python3.11/site-packages/sitecustomize.py

# Copy engine source
COPY services/gflow-engine/server.py /app/server.py
COPY services/gflow-engine/driver.py /app/driver.py
COPY services/gflow-engine/redactor.py /app/redactor.py

# Create dedicated non-root gflow user (uid: 1001, gid: 1001)
RUN groupadd -g 1001 gflow && \
    useradd -u 1001 -g gflow -m -s /bin/bash gflow && \
    mkdir -p /app/flow-profiles /shared/outputs /shared/incidents /tmp/.X11-unix && \
    chmod 1777 /tmp/.X11-unix /tmp && \
    chown -R gflow:gflow /app /shared

# Configure SUID sandbox if present
RUN if [ -f /opt/google/chrome/chrome-sandbox ]; then \
        chown root:root /opt/google/chrome/chrome-sandbox && \
        chmod 4755 /opt/google/chrome/chrome-sandbox ; \
    fi

# Environment
ENV FLOW_PROFILES_DIR=/app/flow-profiles \
    FLOW_OUTPUTS_DIR=/shared/outputs \
    FLOW_INCIDENTS_DIR=/shared/incidents \
    GFLOW_CLI_PATH=/app/upstream_gflow/gflow-cli \
    DISPLAY=:99 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/gflow

USER gflow

EXPOSE 3461

# Start Xvfb for headless display, then launch FastAPI
CMD (rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true) && \
    Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset & \
    sleep 1 && \
    uvicorn server:app --host 0.0.0.0 --port 3461 --log-level info
