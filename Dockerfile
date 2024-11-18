# Build stage
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./

RUN npm ci

COPY src ./src

RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Install cross-env in the production environment
RUN npm install --production --save-dev cross-env

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

# Run the app with cross-env to set environment variables
CMD ["npx", "cross-env", "NODE_ENV=production", "node", "dist/index.js"]
