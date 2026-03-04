#!/usr/bin/env bash
set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required but was not found on PATH." >&2
  exit 1
fi

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI_DEFAULT="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
PWCLI="${PWCLI:-$PWCLI_DEFAULT}"

if [[ ! -x "$PWCLI" ]]; then
  echo "Error: Playwright wrapper not found or not executable at: $PWCLI" >&2
  exit 1
fi

URL="${URL:-http://127.0.0.1:4173/}"
PROMPT="${PROMPT:-Arroz con pollo peruano para 2 personas}"
SESSION="${PLAYWRIGHT_SESSION:-asistente-cocina-ai-flow}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-90}"
POLL_SECONDS="${POLL_SECONDS:-3}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-output/playwright/ai-recipe-workflow}"
HEADED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      URL="$2"
      shift 2
      ;;
    --prompt)
      PROMPT="$2"
      shift 2
      ;;
    --session)
      SESSION="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECONDS="$2"
      shift 2
      ;;
    --poll)
      POLL_SECONDS="$2"
      shift 2
      ;;
    --artifacts-dir)
      ARTIFACTS_DIR="$2"
      shift 2
      ;;
    --headed)
      HEADED=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$ARTIFACTS_DIR"

run_pwcli() {
  "$PWCLI" --session "$SESSION" "$@"
}

latest_snapshot() {
  ls -1t .playwright-cli/page-*.yml 2>/dev/null | head -n1
}

snapshot_and_get_file() {
  local log_file="$1"
  run_pwcli snapshot | tee "$log_file" >/dev/null
  local shot
  shot="$(latest_snapshot)"
  if [[ -z "$shot" ]]; then
    echo "Error: snapshot file not found in .playwright-cli/." >&2
    exit 1
  fi
  echo "$shot"
}

extract_ref() {
  local snapshot_file="$1"
  local pattern="$2"
  grep -E "$pattern" "$snapshot_file" | sed -E 's/.*\[ref=(e[0-9]+)\].*/\1/' | head -n1
}

cleanup() {
  run_pwcli close >/dev/null 2>&1 || true
}
trap cleanup EXIT

open_args=(open "$URL")
if [[ "$HEADED" == true ]]; then
  open_args+=(--headed)
fi
run_pwcli "${open_args[@]}" | tee "$ARTIFACTS_DIR/01-open.log" >/dev/null

SNAPSHOT_1="$(snapshot_and_get_file "$ARTIFACTS_DIR/02-snapshot-initial.log")"
cp "$SNAPSHOT_1" "$ARTIFACTS_DIR/02-initial.yml"

TEXTBOX_REF="$(extract_ref "$SNAPSHOT_1" "textbox .*Ej: salmón al ajillo")"
if [[ -z "$TEXTBOX_REF" ]]; then
  echo "Error: could not find the AI prompt textbox reference." >&2
  exit 1
fi

BUTTON_REF="$(extract_ref "$SNAPSHOT_1" "button \"Agregar receta con IA\"")"
if [[ -z "$BUTTON_REF" ]]; then
  echo "Error: could not find the 'Agregar receta con IA' button reference." >&2
  exit 1
fi

run_pwcli fill "$TEXTBOX_REF" "$PROMPT" | tee "$ARTIFACTS_DIR/03-fill.log" >/dev/null
run_pwcli click "$BUTTON_REF" | tee "$ARTIFACTS_DIR/04-click-generate.log" >/dev/null

end_time=$(( $(date +%s) + TIMEOUT_SECONDS ))
outcome=""
last_snapshot_file=""

while [[ $(date +%s) -lt $end_time ]]; do
  snapshot_log="$ARTIFACTS_DIR/05-poll-$(date +%Y%m%d-%H%M%S).log"
  shot="$(snapshot_and_get_file "$snapshot_log")"
  last_snapshot_file="$shot"

  if grep -q 'heading "Personalizando tu idea"' "$shot"; then
    outcome="clarification_screen"
    break
  fi

  if grep -q 'heading "Configuración"' "$shot" || grep -q 'Ingredientes necesarios' "$shot"; then
    outcome="recipe_generated"
    break
  fi

  if grep -q 'No se pudo' "$shot" || grep -q 'Falta responder:' "$shot" || grep -q 'Escribe una idea de receta' "$shot" || grep -q 'Falta GOOGLE_API_KEY' "$shot"; then
    outcome="error_message"
    break
  fi

  sleep "$POLL_SECONDS"
done

if [[ -n "$last_snapshot_file" && -f "$last_snapshot_file" ]]; then
  cp "$last_snapshot_file" "$ARTIFACTS_DIR/06-final.yml"
fi

(
  cd "$ARTIFACTS_DIR"
  run_pwcli screenshot > "07-screenshot.log" 2>&1 || true
)

if [[ -z "$outcome" ]]; then
  echo "Outcome: timeout_waiting_for_result"
  echo "Artifacts: $ARTIFACTS_DIR"
  exit 2
fi

echo "Outcome: $outcome"
echo "Session: $SESSION"
echo "URL: $URL"
echo "Prompt: $PROMPT"
echo "Artifacts: $ARTIFACTS_DIR"
