# syntax=docker/dockerfile:1.6

# ──────────────────────────────────────────
#  Stage 1 – build
# ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept VITE_* vars as build args so they get baked into the bundle
ARG VITE_API_BASE_URL=https://pool-costing-api.intelithon.in
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# Remove any local .env so only the build-arg values are used
RUN rm -f .env .env.local .env.development

RUN npm run build


# ──────────────────────────────────────────
#  Stage 2 – serve with nginx
# ──────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy compiled static assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Runtime env injection entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ >/dev/null || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
