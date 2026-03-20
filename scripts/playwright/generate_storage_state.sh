#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${PLAYWRIGHT_KEYCHAIN_SERVICE:-AsistenteCocina Playwright Auth}"
OUTPUT_PATH="${PLAYWRIGHT_STORAGE_STATE_OUTPUT:-playwright/.auth/user.json}"
BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:4173}"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if ! command -v security >/dev/null 2>&1; then
  echo "Error: macOS security CLI not found." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but was not found on PATH." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl is required but was not found on PATH." >&2
  exit 1
fi

ACCOUNT_NAME="${PLAYWRIGHT_KEYCHAIN_ACCOUNT:-$(
  security find-generic-password -s "$SERVICE_NAME" 2>/dev/null \
    | awk -F'"' '/"acct"<blob>=/ { print $4; exit }'
)}"

if [[ -z "${ACCOUNT_NAME:-}" ]]; then
  echo "Error: Could not resolve the account name from Keychain service '$SERVICE_NAME'." >&2
  exit 1
fi

PASSWORD_VALUE="$(security find-generic-password -a "$ACCOUNT_NAME" -s "$SERVICE_NAME" -w)"

if [[ -z "${PASSWORD_VALUE:-}" ]]; then
  echo "Error: Could not read the password from Keychain service '$SERVICE_NAME'." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

if ! curl -fsS "$BASE_URL" >/dev/null 2>&1; then
  npm run dev -- --host 127.0.0.1 --port 4173 >/tmp/asistente-cocina-playwright-auth.log 2>&1 &
  SERVER_PID="$!"

  for _ in {1..60}; do
    if curl -fsS "$BASE_URL" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

if ! curl -fsS "$BASE_URL" >/dev/null 2>&1; then
  echo "Error: Could not reach the local app at $BASE_URL." >&2
  exit 1
fi

PLAYWRIGHT_AUTH_EMAIL="$ACCOUNT_NAME" \
PLAYWRIGHT_AUTH_PASSWORD="$PASSWORD_VALUE" \
PLAYWRIGHT_STORAGE_STATE_OUTPUT="$OUTPUT_PATH" \
PLAYWRIGHT_BASE_URL="$BASE_URL" \
npx tsx scripts/playwright/generate_storage_state.ts

echo "Storage state saved to $OUTPUT_PATH"
