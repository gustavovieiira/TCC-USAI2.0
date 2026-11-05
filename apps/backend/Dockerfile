FROM node:24-alpine AS base
# O Prisma precisa do OpenSSL para escolher o motor certo no Alpine.
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci --workspace=apps/backend --include-workspace-root

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY apps/backend ./apps/backend
COPY package*.json ./
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
# node_modules do estágio de build: é nele que o `prisma generate` grava o cliente.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/package*.json ./apps/backend/

WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "dist/server.js"]
