FROM oven/bun:latest AS deps
WORKDIR /app

# Install deps first for better layer caching
COPY package.json bun.lock tsconfig.json ./
RUN bun install --production

COPY src ./src

FROM oven/bun:latest AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app /app

# Persist state.json here (mount a volume on Unraid)
VOLUME ["/data"]

CMD ["bun", "run", "start"]
