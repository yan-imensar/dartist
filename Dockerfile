ARG NODE_VERSION=22-alpine

# ---- Build stage ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app

# Native deps required by better-sqlite3
RUN apk add --no-cache --virtual .build-deps python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Runtime stage ----
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
	PORT=3000 \
	HOST=0.0.0.0 \
	DATA_DIR=/data

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

RUN mkdir -p /data && chown -R node:node /data

USER node
EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "build"]
