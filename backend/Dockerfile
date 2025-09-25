# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for Prisma and build
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY .ts-node.json ./
COPY fix-build.js ./

# Install dependencies
RUN npm ci --only=production

# Copy source code and built dist
COPY dist/ ./dist/
COPY prisma/ ./prisma/
COPY .env.production ./.env
COPY start-production.js ./

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"] 