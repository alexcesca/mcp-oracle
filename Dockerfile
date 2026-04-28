FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy tsconfig and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript to Javascript
RUN npm run build

# ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built output from the builder stage
COPY --from=builder /app/dist ./dist

# Run the MCP server
CMD ["node", "dist/index.js"]
