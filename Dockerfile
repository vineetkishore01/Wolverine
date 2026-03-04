# ============================================================
# Wolverine – Dockerfile
# ============================================================
# Multi-stage build for a lean, production-ready image.
# Supports full browser automation via Pinchtab + Google Chrome.

# ── Stage 1: Builder ────────────────────────────────────────
FROM node:20-bookworm AS builder

# Build-time dependencies for native modules (node-pty, better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package.json ./

# Install all dependencies (including devDeps for build)
RUN npm install && npm cache clean --force

# Copy source and config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

# Install system dependencies for Google Chrome & node-pty
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    wget \
    # node-pty runtime deps
    python3 \
    make \
    g++ \
    # Chrome dependencies
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Chromium (supports amd64 and arm64)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Set binary path for Pinchtab
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

# Copy static assets (if any)
# Note: if web-ui is managed as a separate build/dist, adjust this path.
COPY web-ui/ ./web-ui/

# Create data directories (will be overridden by volume mounts)
RUN mkdir -p /app/.wolverine /app/workspace

# ── Environment Configuration ────────────────────────────────
ENV NODE_ENV=production \
    WOLVERINE_DATA_DIR=/app/.wolverine \
    WOLVERINE_WORKSPACE_DIR=/app/workspace \
    GATEWAY_PORT=18789 \
    OLLAMA_HOST=http://host.docker.internal:11434

EXPOSE 18789

# Healthcheck to verify the gateway is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:18789/api/status || exit 1

# Start the gateway
ENTRYPOINT ["node", "dist/cli/index.js"]
CMD ["gateway", "start"]
