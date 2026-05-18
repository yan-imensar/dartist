ARG NODE_VERSION=22-alpine

# ---- Build stage ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Runtime stage ----
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
	PORT=3000 \
	HOST=0.0.0.0

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

USER node
EXPOSE 3000

CMD ["node", "build"]
