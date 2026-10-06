#!/usr/bin/env bash
# Local workflow helper for ChronoWork (see docs/adr/0001-local-development-environment.md).
#
#   scripts/run.sh setup     install dependencies
#   scripts/run.sh dev       start the dev server on http://localhost:3000
#   scripts/run.sh check     type check + unit tests + production build
#   scripts/run.sh preview   production build, served on http://localhost:4173
#   scripts/run.sh clean     remove dist/
#
# Uses Bun when installed (bun.lock is the committed lockfile), npm otherwise.
set -euo pipefail

cd "$(dirname "$0")/.."

info() { printf '\033[1;34m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*" >&2; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

usage() {
  sed -n '4,8p' "$0" | sed 's/^# \{0,1\}//'
}

# Vitest 5 supports ^22.12 || ^24 || >=26; Vite 8 needs ^20.19 || >=22.12.
check_node() {
  command -v node >/dev/null || fail "Node.js is not installed. Install Node 24 LTS: https://nodejs.org"
  local version major minor
  version=$(node -p 'process.versions.node')
  major=${version%%.*}
  minor=$(echo "$version" | cut -d. -f2)
  if [ "$major" -lt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -lt 12 ]; }; then
    fail "Node $version is too old. Use Node 24 LTS (or >= 22.12)."
  fi
  if [ "$major" -eq 23 ] || [ "$major" -eq 25 ]; then
    warn "Node $version is outside Vitest's supported range. Node 24 LTS is recommended."
  fi
}

if command -v bun >/dev/null; then
  PM=bun
  INSTALL=(bun install)
else
  PM=npm
  INSTALL=(npm install --no-package-lock)
fi

install_deps() {
  info "Installing dependencies with $PM"
  "${INSTALL[@]}"
}

ensure_deps() {
  [ -d node_modules ] || install_deps
}

run() {
  info "$PM run $1"
  "$PM" run "$1"
}

command=${1:-}
case "$command" in
  setup)
    check_node
    install_deps
    ;;
  dev)
    check_node
    ensure_deps
    run dev
    ;;
  check)
    check_node
    ensure_deps
    run lint
    run test
    run build
    info "All checks passed"
    ;;
  preview)
    check_node
    ensure_deps
    run build
    info "Serving dist/ on http://localhost:4173 (data is separate from the dev server on :3000)"
    run preview
    ;;
  clean)
    run clean
    ;;
  -h | --help | help | '')
    usage
    ;;
  *)
    usage
    fail "Unknown command: $command"
    ;;
esac
