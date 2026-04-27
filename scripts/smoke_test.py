#!/usr/bin/env python3
"""
smoke_test.py — verify every source in sources.py without calling the LLM.

For each source:
  - HTTP fetch
  - parse with the right adapter
  - report number of candidates returned (and the first headline)
  - report any errors

Use this after editing sources.py, or in CI as a health check.

Output is grouped by category and ends with a summary table.
"""

from __future__ import annotations

import importlib.util
import os
import sys
import time
import traceback
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

# Load example-scraper.py (dash in filename means we can't `import` it directly)
_spec = importlib.util.spec_from_file_location("scraper_mod", HERE / "example-scraper.py")
assert _spec and _spec.loader
scraper_mod = importlib.util.module_from_spec(_spec)
sys.modules["scraper_mod"] = scraper_mod  # required for dataclass to resolve types
_spec.loader.exec_module(scraper_mod)  # type: ignore

from sources import ALL_SOURCES  # noqa: E402


def main() -> int:
    by_cat: dict[str, list] = defaultdict(list)
    for s in ALL_SOURCES:
        by_cat[s.category].append(s)

    rows: list[tuple[str, str, str, int, str]] = []
    total_ok = 0
    total_fail = 0
    total_skipped = 0

    for cat in sorted(by_cat):
        print(f"\n=== {cat} ===")
        for s in by_cat[cat]:
            if not s.enabled:
                rows.append((cat, s.name, "skipped", 0, ""))
                total_skipped += 1
                print(f"   -  {s.name:60s} disabled")
                continue
            t0 = time.time()
            try:
                cands = scraper_mod.fetch(s)
                dt = time.time() - t0
                first = cands[0].headline[:80] if cands else "(no items)"
                rows.append((cat, s.name, "ok", len(cands), first))
                total_ok += 1
                print(f"   ok {s.name:60s} {len(cands):3d} items ({dt:4.1f}s)  {first}")
            except Exception as e:
                rows.append((cat, s.name, "fail", 0, str(e)[:120]))
                total_fail += 1
                print(f"   ER {s.name:60s} {str(e)[:120]}")
                if os.environ.get("DEBUG"):
                    traceback.print_exc()

    print("\n" + "=" * 70)
    print(f"SUMMARY: {total_ok} ok, {total_fail} failed, {total_skipped} disabled")
    print("=" * 70)

    fails = [r for r in rows if r[2] == "fail"]
    if fails:
        print("\nFailed sources (consider disabling or fixing the URL):")
        for r in fails:
            print(f"  {r[0]:18s} {r[1]:55s} {r[4]}")

    empty = [r for r in rows if r[2] == "ok" and r[3] == 0]
    if empty:
        print("\nReachable but returned zero items (selectors may need work):")
        for r in empty:
            print(f"  {r[0]:18s} {r[1]}")

    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
