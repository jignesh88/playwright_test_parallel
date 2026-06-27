#!/usr/bin/env bash
# After the report image is built, extract each suite's history/ directory from
# inside the image into docker/history/<suite>/ on the host. This carries trend
# data forward to the next build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HISTORY="$ROOT/docker/history"
IMAGE="${ALLURE_REPORT_IMAGE:-retailflow/allure-report:local}"

mkdir -p "$HISTORY/app" "$HISTORY/bdd" "$HISTORY/external"

cid="$(docker create "$IMAGE")"
trap 'docker rm -f "$cid" >/dev/null 2>&1 || true' EXIT

for suite in app bdd external; do
  src_in_image="/usr/share/nginx/html/reports/$suite/history"
  # docker cp from a non-existent path errors; redirect its stderr and check exit.
  tmp="$(mktemp -d)"
  if docker cp "$cid:$src_in_image/." "$tmp/" 2>/dev/null; then
    rm -rf "$HISTORY/$suite"
    mkdir -p "$HISTORY/$suite"
    cp -R "$tmp/." "$HISTORY/$suite/"
    # Touch files so the 7-day prune window restarts from "now".
    find "$HISTORY/$suite" -type f -exec touch {} +
    echo "extracted: $suite history -> docker/history/$suite"
  else
    echo "skip:      $suite (no history in image — suite likely not built)"
  fi
  rm -rf "$tmp"
done
