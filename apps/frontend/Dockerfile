FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
RUN npm ci --workspace=apps/frontend --include-workspace-root
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
# O nginx troca ${API_ORIGIN} e ${API_WS_ORIGIN} neste modelo ao iniciar (vão na política de segurança de conteúdo).
COPY apps/frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
ENV API_ORIGIN=http://localhost:3000
ENV API_WS_ORIGIN=ws://localhost:3000
EXPOSE 80
