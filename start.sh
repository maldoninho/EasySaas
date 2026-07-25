#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

# Reuse a user-level NVM installation automatically when available.
NODE_OK=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || printf 0)"
  NODE_MINOR="$(node -p "process.versions.node.split('.')[1]" 2>/dev/null || printf 0)"
  if [ "$NODE_MAJOR" = "24" ] && [ "$NODE_MINOR" -ge 12 ]; then NODE_OK=1; fi
fi

if [ "$NODE_OK" -ne 1 ]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
    if nvm ls 24.18.0 >/dev/null 2>&1; then
      nvm use 24.18.0 >/dev/null
    fi
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  printf '\n[ERRO] Node.js não foi encontrado.\n'
  printf 'Instale uma vez com: nvm install 24.18.0 && nvm use 24.18.0\n\n'
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
NODE_MINOR="$(node -p "process.versions.node.split('.')[1]")"
if [ "$NODE_MAJOR" != "24" ] || [ "$NODE_MINOR" -lt 12 ]; then
  printf '\n[ERRO] Esta versão requer Node.js 24.12+ LTS. Encontrado: %s\n' "$(node -v)"
  printf 'Execute uma vez: nvm install 24.18.0 && nvm use 24.18.0\n\n'
  exit 1
fi

exec node scripts/bootstrap.mjs
