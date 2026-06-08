# Waddle backend — portable container image (Fly.io, Render, or Railway).
# Build context is the backend/ directory.
FROM node:20-slim

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript -> dist/ (also copies SQL migrations).
COPY . .
RUN npm run build

ENV NODE_ENV=production
# The host injects PORT; the server reads process.env.PORT and falls back to 3001.
EXPOSE 3001

# Runs migrations on boot, then starts the persistent Express server.
CMD ["npm", "start"]
