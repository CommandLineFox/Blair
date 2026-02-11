FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./

RUN npm ci

COPY src ./src

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /usr/src/app

RUN npm install --production --save-dev cross-env

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

WORKDIR /usr/src/app/dist

CMD ["npx", "cross-env", "NODE_ENV=production", "node", "index.js"]