#!/usr/bin/env bash
# Generate one Allure HTML report per subdirectory of $1 into $2.
# Example: generate-reports.sh /results /report
#   /results/app  -> /report/app
#   /results/bdd  -> /report/bdd
set -euo pipefail

RESULTS_ROOT="${1:?results dir required}"
REPORT_ROOT="${2:?report dir required}"

mkdir -p "$REPORT_ROOT"

shopt -s nullglob
found=0
for results_dir in "$RESULTS_ROOT"/*/; do
  name="$(basename "$results_dir")"
  # Skip empty dirs (e.g. created by the staging script but never populated).
  if [ -z "$(find "$results_dir" -maxdepth 1 -name '*-result.json' -print -quit)" ]; then
    echo "skip: $name (no result json files)"
    continue
  fi
  echo "generating: $name"
  allure generate "$results_dir" --clean -o "$REPORT_ROOT/$name"
  found=$((found + 1))
done

if [ "$found" -eq 0 ]; then
  echo "WARNING: no allure-results found under $RESULTS_ROOT — building an empty image" >&2
fi
