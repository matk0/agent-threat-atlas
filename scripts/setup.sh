#!/usr/bin/env bash
# scripts/setup.sh — one-command project setup.
#
# Run from the project root:
#   bash scripts/setup.sh
#
# Idempotent. Safe to re-run any time.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

bold "Agent Threat Atlas — setup"
echo

# 1. Node deps for the website
if [ ! -d "node_modules" ]; then
  bold "[1/4] Installing Node dependencies (npm install)"
  npm install --no-audit --no-fund
else
  green "[1/4] Node dependencies already installed (delete node_modules to redo)"
fi
echo

# 2. Python venv
if [ ! -d ".venv" ]; then
  bold "[2/4] Creating Python virtualenv at .venv"
  python3 -m venv .venv
else
  green "[2/4] Python virtualenv .venv already exists"
fi
echo

# 3. Python deps inside the venv
bold "[3/4] Installing Python dependencies into .venv"
# shellcheck source=/dev/null
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r scripts/requirements.txt
deactivate
echo

# 4. .env scaffolding
if [ ! -f "scripts/.env" ]; then
  bold "[4/4] Creating scripts/.env from scripts/.env.example"
  cp scripts/.env.example scripts/.env
  yellow "    -> Edit scripts/.env and paste your NVIDIA_API_KEY."
  yellow "    -> Get one at https://build.nvidia.com"
else
  green "[4/4] scripts/.env already exists (leaving it alone)"
fi
echo

bold "Done."
echo
echo "Next:"
echo "  Run the website:   npm run dev          # http://localhost:3000"
echo "  Smoke-test feeds:  bash scripts/scrape.sh --smoke"
echo "  Run the scraper:   bash scripts/scrape.sh --dry --limit 5"
echo "  Full scrape:       bash scripts/scrape.sh"
