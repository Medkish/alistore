#!/usr/bin/env bash
# Runs on the hosting server when the web service starts.
# 1) Creates the database schema (no migration history is shipped).
# 2) Seeds sample data only when the database is brand new.
# 3) Starts the Express backend, which also serves the built frontend at /alistore/.
set -e

cd "$(dirname "$0")/../backend"

echo "Creating database schema..."
npx prisma db push --skip-generate --accept-data-loss

echo "Checking whether the database needs initial data..."
if node -e "require('./src/lib/prisma').category.count().then(n=>{process.exit(n?0:1)})"; then
  echo "Database already has data — skipping seed."
else
  echo "Empty database — seeding starter data..."
  node prisma/seed.js
fi

echo "Starting AlioStore backend..."
exec node src/server.js