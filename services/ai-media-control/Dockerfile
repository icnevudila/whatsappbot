# AI Media Control — Orchestration & Validation Service
# Port: 3460
# Single write authority for all ai_media_* tables

FROM node:22-slim

# Install ffmpeg for video validation and frame extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and build creative-video-orchestrator
COPY services/creative-video-orchestrator /creative-video-orchestrator
RUN cd /creative-video-orchestrator && npm install && npm run build

# Install dependencies
COPY services/ai-media-control/package.json /app/package.json
COPY services/ai-media-control/tsconfig.json /app/tsconfig.json
RUN npm install

# Copy source
COPY services/ai-media-control/src /app/src

# Build TypeScript
RUN npm run build

# Create shared mount directories
RUN mkdir -p /shared/outputs /shared/incidents

# Environment
ENV NODE_ENV=production \
    PORT=3460 \
    SHARED_OUTPUTS_DIR=/shared/outputs \
    SHARED_INCIDENTS_DIR=/shared/incidents

EXPOSE 3460

CMD ["node", "dist/index.js"]
