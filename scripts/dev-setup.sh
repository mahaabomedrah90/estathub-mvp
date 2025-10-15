#!/usr/bin/env bash
set -e

echo ">>> Creating branches"
git checkout -b dev || true

echo ">>> Frontend install"
cd frontend
npm i -g pnpm || true
pnpm install || true
cd ..

echo ">>> Backend install"
cd backend
pnpm install || true
cd ..

echo ">>> Done"
