# apps/user-service/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files first (Docker layer caching)
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source code (.dockerignore prevents .env and node_modules)
COPY . .

# User service runs on port 3001
EXPOSE 3001

# Health check for Docker to monitor container health
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application (matches "scripts.start" in package.json)
CMD ["node", "server.js"]
