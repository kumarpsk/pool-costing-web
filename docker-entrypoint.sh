#!/bin/sh
# Runs at container start — injects runtime env vars into the SPA
# Variables are exposed as window.__env__ in the browser

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__env__ = {
  VITE_SMTP_SERVER:    "${VITE_SMTP_SERVER:-smtp.gmail.com}",
  VITE_SMTP_PORT:      "${VITE_SMTP_PORT:-587}",
  VITE_EMAIL_USERNAME: "${VITE_EMAIL_USERNAME:-}",
  VITE_EMAIL_PASSWORD: "${VITE_EMAIL_PASSWORD:-}",
  SMTP_USE_SSL:        "${SMTP_USE_SSL:-false}",
  VITE_API_BASE_URL:   "${VITE_API_BASE_URL:-https://pool-costing-api.intelithon.in}"
};
EOF

echo "✅ env-config.js written"
exec nginx -g "daemon off;"
