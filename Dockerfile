# =============================================================================
# Dockerfile — create-win-project CLI
# CI-aligned: node:20-alpine (matches .github/workflows/ci.yml & publish.yml)
# Usage:
#   docker build -t create-win-project:dev .
#   docker run -it --rm -v $(pwd)/.demo:/app/.demo create-win-project:dev
#   docker compose run --rm app
# =============================================================================
FROM node:20-alpine

WORKDIR /app

# Install deps first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy rest of project
COPY . .

# CLI entrypoint — allows `docker run image --help` and interactive prompts
ENTRYPOINT ["node", "index.js"]
