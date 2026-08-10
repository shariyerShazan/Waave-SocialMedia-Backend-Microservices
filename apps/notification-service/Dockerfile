# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .


# Generate proto types
RUN npm run proto:generate

RUN npm run build notification-service

RUN npm prune --production


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/libs/proto-schema/src/proto ./libs/proto-schema/src/proto

EXPOSE 3010
EXPOSE 3010

CMD ["node", "dist/apps/notification-service/main.js"]