FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/dist ./dist

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

CMD ["node", "dist/index.js"]