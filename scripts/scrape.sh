#!/usr/bin/env bash
# scripts/scrape.sh — run the daily scraper inside the project venv.
#
# Usage:
#   bash scripts/scrape.sh                    # full run
#   bash scripts/scrape.sh --smoke            # just check sources, no LLM
#   bash scripts/scrape.sh --dry --limit 5    # categorize 5, don't write file
#   bash scripts/scrape.sh --only "Embrace"   # only sources matching substring
#
# Forwards all args to scripts/example-scraper.py.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d ".venv" ]; then
  echo "ERROR: .venv missing. Run: bash scripts/setup.sh"
  exit 1
fi

# shellcheck source=/dev/null
source .venv/bin/activate

if [ -f "scripts/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source scripts/.env
  set +a
fi

python3 scripts/example-scraper.py "$@"
