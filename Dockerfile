FROM node:22-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl ffmpeg

# Download yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install ffmpeg for video processing and curl
RUN apk add --no-cache curl ffmpeg

# Copy yt-dlp from builder
COPY --from=builder /usr/local/bin/yt-dlp /usr/local/bin/yt-dlp

# Copy built app
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package.json /app/package.json

# Set environment
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]