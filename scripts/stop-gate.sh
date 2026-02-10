#!/usr/bin/env bash
set -euo pipefail

# Swarm Kit Stop Gate
# Prevents premature task completion by verifying:
#   1. A build log exists
#   2. The latest build log contains QC approval
#
# Called by .claude/settings.json hook.
# Exit 0 = gate passed, Exit 1 = gate blocked.
#
# Path resolution note: BUILD_LOGS_DIR is resolved relative to this script's
# location (SCRIPT_DIR/../build-logs), NOT relative to the current working
# directory. This is intentional — SCRIPT_DIR is deterministic regardless of
# where Claude Code or the hook system sets cwd, making the gate reliable
# across different invocation contexts.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_LOGS_DIR="$SCRIPT_DIR/../build-logs"

# Check build-logs directory exists
if [ ! -d "$BUILD_LOGS_DIR" ]; then
    echo "STOP GATE: build-logs/ directory not found. Pipeline has not run." >&2
    exit 1
fi

# Find the most recent build log
LATEST_LOG=$(ls -t "$BUILD_LOGS_DIR"/*.md 2>/dev/null | head -1)

if [ -z "$LATEST_LOG" ]; then
    echo "STOP GATE: No build log found. Pipeline has not completed. Do not declare task done." >&2
    exit 1
fi

# Check for QC approval in the latest log
if ! grep -q "QC Status:.*APPROVED" "$LATEST_LOG" 2>/dev/null; then
    echo "STOP GATE: QC has not approved this delivery. Pipeline must complete before task is done." >&2
    echo "Latest log checked: $LATEST_LOG" >&2
    exit 1
fi

echo "Stop gate passed: QC approved in $LATEST_LOG"
exit 0
