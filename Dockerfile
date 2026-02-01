# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/config ./config
COPY --from=builder /app/db ./db
COPY --from=builder /app/utils ./utils

# Expose port
EXPOSE 3000

# Run the application
CMD ["node", "src/app.mjs"]
