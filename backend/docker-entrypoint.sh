#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding demo data..."
  npx tsx prisma/seed.ts || true
fi

echo "Starting server..."
exec node dist/server.js
