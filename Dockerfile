# Build stage
FROM node:18-slim AS builder
WORKDIR /app

# Leverage Docker build cache for faster npm installs
COPY package*.json ./
COPY tsconfig.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source and build
COPY src ./src
RUN npm run build

# Prune devDependencies so we can copy production node_modules
RUN npm prune --omit=dev

# Production stage
FROM node:18-slim
WORKDIR /app

# Install necessary dependencies for transformers and network connectivity
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    openssl \
    libssl3 \
    dnsutils \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create cache directory for transformers models
RUN mkdir -p /app/.cache/huggingface

# Set environment variables for transformers
ENV NODE_ENV=production
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV HF_HOME=/app/.cache/huggingface


# Copy app artifacts
COPY package*.json ./
# Reuse production node_modules from builder to avoid a second network install
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY knowledge.txt ./knowledge.txt


CMD ["node", "dist/index.js"]
