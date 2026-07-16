#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"

is_managed_process() {
    local process_id="${1:-}"
    [[ "$process_id" =~ ^[0-9]+$ ]] || return 1
    kill -0 "$process_id" 2>/dev/null || return 1

    local command_line
    command_line="$(ps -p "$process_id" -o command= 2>/dev/null || true)"
    [[ "$command_line" == *"npm run dev"* && "$command_line" == *"--host 127.0.0.1"* ]]
}

stop_process_tree() {
    local root_process_id="$1"
    local child_process_id

    while IFS= read -r child_process_id; do
        [[ -n "$child_process_id" ]] || continue
        stop_process_tree "$child_process_id"
    done < <(pgrep -P "$root_process_id" 2>/dev/null || true)

    PROCESS_TREE_PIDS+=("$root_process_id")
}

any_process_running() {
    local process_id
    for process_id in "${PROCESS_TREE_PIDS[@]}"; do
        if kill -0 "$process_id" 2>/dev/null; then
            return 0
        fi
    done
    return 1
}

if [[ ! -f "$PID_FILE" ]]; then
    echo "Frontend is not running."
    exit 0
fi

process_id="$(tr -d '[:space:]' < "$PID_FILE")"
if ! is_managed_process "$process_id"; then
    rm -f "$PID_FILE"
    echo "Frontend PID file was stale; no unrelated process was stopped."
    exit 0
fi

echo "Stopping frontend process tree (PID $process_id)..."
PROCESS_TREE_PIDS=()
stop_process_tree "$process_id"
for tree_process_id in "${PROCESS_TREE_PIDS[@]}"; do
    kill "$tree_process_id" 2>/dev/null || true
done

for _ in {1..40}; do
    if ! any_process_running; then
        break
    fi
    sleep 0.25
done

if any_process_running; then
    for tree_process_id in "${PROCESS_TREE_PIDS[@]}"; do
        kill -9 "$tree_process_id" 2>/dev/null || true
    done
    sleep 0.25
fi

if any_process_running; then
    echo "Frontend process tree did not stop." >&2
    exit 1
fi

rm -f "$PID_FILE"
echo "Frontend stopped."
