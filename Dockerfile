# =============================================================================
# Dockerfile — create-win-project CLI
# CI-aligned with the current compatibility profile.
# Usage:
#   docker build -t create-win-project:dev .
#   docker run -it --rm -v $(pwd)/.demo:/app/.demo create-win-project:dev
#   docker compose run --rm app
# =============================================================================
FROM node:24.20.0-alpine

WORKDIR /app

# Install deps first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy rest of project
COPY . .

# CLI entrypoint — allows `docker run image --help` and interactive prompts
ENTRYPOINT ["node", "index.js"]
