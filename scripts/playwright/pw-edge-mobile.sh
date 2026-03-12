#!/usr/bin/env bash
set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI_DEFAULT="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
PWCLI="${PWCLI:-$PWCLI_DEFAULT}"
CONFIG_PATH="${PLAYWRIGHT_EDGE_CONFIG:-$(cd "$(dirname "$0")" && pwd)/playwright-cli.edge-mobile.json}"

if [[ ! -x "$PWCLI" ]]; then
  echo "Error: Playwright wrapper not found or not executable at: $PWCLI" >&2
  exit 1
fi

exec "$PWCLI" --config "$CONFIG_PATH" "$@"
