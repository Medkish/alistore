#!/usr/bin/env bash
# Runs on the hosting server (Linux) before start. Builds the backend
# dependencies and the statically-exported frontend (frontend/out), which the
# Express backend then serves itself.
set -e

echo "[1/4] Installing backend dependencies..."
cd backend
npm ci --no-audit --no-fund
npx prisma generate
cd ..

echo "[2/4] Installing frontend dependencies..."
cd frontend
npm ci --no-audit --no-fund
cd ..

echo "[3/4] Building static frontend..."
cd frontend
npx next build
cd ..

echo "[4/4] Build complete."