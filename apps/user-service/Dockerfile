# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .


# Generate proto types
RUN npm run proto:generate
# Generate prisma client
RUN npm run user:prisma:generate


RUN npm run build user-service

RUN npm prune --production


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3001
EXPOSE 4001

CMD ["node", "dist/apps/user-service/main.js"]