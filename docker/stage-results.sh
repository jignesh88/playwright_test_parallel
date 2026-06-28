#!/usr/bin/env bash
# Copy whichever allure-results-* dirs exist into docker/staging/{app,bdd,external}.
# Also inject previously-persisted history from docker/history/<suite>/ so the
# generated report includes trend widgets across recent runs. History older than
# 7 days is pruned so trends never exceed a 7-day rolling window.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING="$ROOT/docker/staging"
HISTORY="$ROOT/docker/history"
RETENTION_DAYS="${ALLURE_HISTORY_RETENTION_DAYS:-7}"

rm -rf "$STAGING"
mkdir -p "$STAGING/app" "$STAGING/bdd" "$STAGING/external"
mkdir -p "$HISTORY/app" "$HISTORY/bdd" "$HISTORY/external"

# Prune history files (and any leftover empty dirs) older than the retention
# window. If every file in a suite's history dir is pruned, the next build
# starts a fresh trend — that's the desired behavior after a week of silence.
prune_history() {
  local suite="$1"
  local dir="$HISTORY/$suite"
  if [ -d "$dir" ]; then
    find "$dir" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
    find "$dir" -type d -empty -delete 2>/dev/null || true
    mkdir -p "$dir"
  fi
}

stage() {
  local src="$1" dest="$2"
  prune_history "$dest"
  if [ -d "$ROOT/$src" ] && [ -n "$(ls -A "$ROOT/$src" 2>/dev/null || true)" ]; then
    cp -R "$ROOT/$src/." "$STAGING/$dest/"
    echo "staged: $src -> docker/staging/$dest"
  else
    echo "skip:   $src (missing or empty)"
  fi
  # Inject prior history into the staged results so allure generate picks it up.
  if [ -n "$(ls -A "$HISTORY/$dest" 2>/dev/null || true)" ]; then
    mkdir -p "$STAGING/$dest/history"
    cp -R "$HISTORY/$dest/." "$STAGING/$dest/history/"
    echo "        injected prior history (${RETENTION_DAYS}-day window)"
  fi
  # Inject categories.json so Allure's Categories tab groups failures by type.
  if [ -f "$ROOT/docker/categories.json" ]; then
    cp "$ROOT/docker/categories.json" "$STAGING/$dest/categories.json"
  fi
}

stage allure-results          app
stage allure-results-bdd      bdd
stage allure-results-external external
