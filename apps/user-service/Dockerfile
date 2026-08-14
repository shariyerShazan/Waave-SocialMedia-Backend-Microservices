# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate prisma client
RUN npm run user:prisma:generate

RUN npm run build user-service

# --- STAGE 2: Runner Stage ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/user-service/prisma ./apps/user-service/prisma
COPY --from=builder /app/libs/proto-schema/src/proto ./libs/proto-schema/src/proto

EXPOSE 3001
EXPOSE 4001

CMD ["node", "dist/apps/user-service/main.js"]