# IntakeAI Health - Production Dockerfile

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    sqlite \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production && npm cache clean --force

# Copy application code
COPY . .

# Build application (if you have a build step)
# RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S intakeai -u 1001

# Create necessary directories
RUN mkdir -p logs data && \
    chown -R intakeai:nodejs /app

# Switch to non-root user
USER intakeai

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health/live || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]