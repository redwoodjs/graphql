#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/simoncrypta/redwoodGQL.git}"
REPO_DIR="${REPO_DIR:-redwoodGQL}"

ensure_vp() {
  if command -v vp >/dev/null 2>&1; then
    return 0
  fi

  echo "Installing Vite+ (vp)..."
  curl -fsSL https://vite.plus | bash

  if [[ -f "${HOME}/.vite-plus/env.sh" ]]; then
    # shellcheck disable=SC1091
    source "${HOME}/.vite-plus/env.sh"
  elif [[ -d "${HOME}/.vite-plus/bin" ]]; then
    export PATH="${HOME}/.vite-plus/bin:${PATH}"
  fi

  if ! command -v vp >/dev/null 2>&1; then
    echo "vp is installed but not on PATH. Open a new shell, then run this script again." >&2
    exit 1
  fi
}

in_repo_root() {
  [[ -f package.json ]] && grep -q '"name"[[:space:]]*:[[:space:]]*"rwgql"' package.json
}

ensure_vp

if in_repo_root; then
  :
elif [[ -d "${REPO_DIR}/.git" ]]; then
  cd "${REPO_DIR}"
else
  git clone "${REPO_URL}" "${REPO_DIR}"
  cd "${REPO_DIR}"
fi

echo "Validating Node.js and pnpm (requires Node >= 22.18.0)..."
vp env doctor

echo "Installing dependencies..."
vp install

echo "Starting dev servers..."
vp run dev
