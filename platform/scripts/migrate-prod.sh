#!/usr/bin/env bash
# Safe production migration script
# Runs prisma migrate deploy (never migrate dev) against the production database.
# Requires DATABASE_URL to be set in the environment.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

echo "Running Prisma production migrations..."
npx prisma migrate deploy

echo "Migrations complete."
