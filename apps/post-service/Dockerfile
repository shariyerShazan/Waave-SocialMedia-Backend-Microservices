# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate --schema=./apps/post-service/prisma/schema.prisma

RUN npm run build post-service

RUN npm prune --production


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/post-service/prisma ./apps/post-service/prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3003

CMD ["node", "dist/apps/post-service/main.js"]