FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

# Overridden in k8s to backend.gym-tracker.svc.cluster.local:8100
ENV BACKEND_HOST=backend:8100

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
