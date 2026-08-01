# --- STAGE 1: Build Stage ---
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . . 

# Generate prisma client
RUN npm run auth:prisma:generate

RUN npm run build auth-service

FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/auth-service/prisma ./apps/auth-service/prisma
COPY --from=builder /app/libs/proto-schema/src/proto ./libs/proto-schema/src/proto

EXPOSE 4001
EXPOSE 3001

CMD ["node", "dist/apps/auth-service/main.js"]