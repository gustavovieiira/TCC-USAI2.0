FROM node:20-alpine AS build
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
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
