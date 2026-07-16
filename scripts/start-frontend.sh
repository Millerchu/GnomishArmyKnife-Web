#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"
LOG_DIR="$FRONTEND_ROOT/logs"
LOG_FILE="$LOG_DIR/frontend.log"

is_managed_process() {
    local process_id="${1:-}"
    [[ "$process_id" =~ ^[0-9]+$ ]] || return 1
    kill -0 "$process_id" 2>/dev/null || return 1

    local command_line
    command_line="$(ps -p "$process_id" -o command= 2>/dev/null || true)"
    [[ "$command_line" == *"npm run dev"* && "$command_line" == *"--host 127.0.0.1"* ]]
}

port_is_listening() {
    lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1
}

if [[ -f "$PID_FILE" ]]; then
    existing_process_id="$(tr -d '[:space:]' < "$PID_FILE")"
    if is_managed_process "$existing_process_id"; then
        echo "Frontend is already running (PID $existing_process_id)."
        exit 0
    fi
    rm -f "$PID_FILE"
fi

mkdir -p "$LOG_DIR"

if [[ ! -d "$FRONTEND_ROOT/node_modules" ]]; then
    echo "Frontend dependencies are missing. Run npm install in $FRONTEND_ROOT first." >&2
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    echo "Frontend cannot start: npm was not found in PATH." >&2
    exit 1
fi
if ! command -v lsof >/dev/null 2>&1; then
    echo "Frontend cannot start: lsof is required for port readiness checks." >&2
    exit 1
fi
if port_is_listening; then
    echo "Frontend cannot start: port 5173 is already in use." >&2
    exit 1
fi

cd "$FRONTEND_ROOT"
nohup npm run dev -- --host 127.0.0.1 --strictPort >"$LOG_FILE" 2>&1 < /dev/null &
started_process_id=$!
printf '%s\n' "$started_process_id" > "$PID_FILE"
startup_confirmed=0
for _ in {1..60}; do
    if ! is_managed_process "$started_process_id"; then
        rm -f "$PID_FILE"
        echo "Frontend process exited during startup. See $LOG_FILE" >&2
        exit 1
    fi
    if port_is_listening; then
        startup_confirmed=1
        break
    fi
    sleep 0.5
done

if [[ "$startup_confirmed" -ne 1 ]]; then
    bash "$SCRIPT_DIR/stop-frontend.sh" >/dev/null 2>&1 || true
    echo "Frontend did not listen on port 5173 within 30 seconds. See $LOG_FILE" >&2
    exit 1
fi

echo "Frontend started (PID $started_process_id)."
