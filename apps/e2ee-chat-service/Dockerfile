# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate proto types
RUN npm run proto:generate
# Generate prisma client
RUN npm run e2ee-chat:prisma:generate


RUN npm run build e2ee-chat-service

RUN npm prune --production


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 4006
EXPOSE 3006

CMD ["node", "dist/apps/e2ee-chat-service/main.js"]