#!/bin/bash
set -e

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "DLS Magician Cloud requires Node.js 20 or newer."
  echo "Install Node.js, then run this file again."
  read -r -p "Press Return to close..."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20 or newer is required. Current version: $(node --version)"
  read -r -p "Press Return to close..."
  exit 1
fi

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

echo "Starting DLS Magician Cloud at ${URL}"

# Open the product after the local server has had a moment to start.
(
  sleep 1
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 || true
  fi
) &

PORT="$PORT" node server.js
