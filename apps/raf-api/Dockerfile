# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production ORT_DISABLE_TELEMETRY=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# skip: the GPU (CUDA) libraries, several hundred MB.
RUN --mount=type=cache,target=/root/.npm NODE_ENV=development ONNXRUNTIME_NODE_INSTALL=skip npm ci

# The OCR models of the built-in receipt reader; only downloaded again when the script changes.
FROM base AS models
COPY scripts/download-models.mjs ./scripts/
RUN node scripts/download-models.mjs /models

FROM deps AS build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
# ONNX Runtime ships every platform's library; keep only this image's.
RUN npm run build && npm prune --omit=dev --ignore-scripts \
  && find node_modules/onnxruntime-node/bin -mindepth 3 -maxdepth 3 -type d \
    ! -path "*/linux/$(node -p process.arch)" -exec rm -rf {} +

FROM base AS runtime
RUN groupadd -r app && useradd -r -g app app && mkdir -p /app/uploads && chown app:app /app/uploads
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=models --chown=app:app /models ./models
COPY --chown=app:app package.json prisma.config.ts ./
COPY --chown=app:app prisma ./prisma
USER app
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:'+(process.env.PORT||3100)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main"]
