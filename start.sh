#!/bin/bash
# ====================================================
# start.sh — Start the Notion Clone app
# ====================================================

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
VENV_PYTHON="$BACKEND/venv/bin/python3"

echo "🚀 Starting Notion Clone..."
echo ""

# ─── Backend ─────────────────────────────────────────
echo "📡 Starting FastAPI backend on http://localhost:8000..."
cd "$BACKEND"
"$VENV_PYTHON" -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo ""

# ─── Frontend ────────────────────────────────────────
echo "⚛️  Starting React frontend on http://localhost:5173..."
cd "$FRONTEND"

# Find npm (tries Homebrew path first)
NPM=$(command -v npm 2>/dev/null || echo "/opt/homebrew/bin/npm")

if [ ! -d node_modules ]; then
  echo "Installing npm deps (first run)..."
  "$NPM" install
fi

"$NPM" run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo ""

echo "✅ Both servers started!"
echo "   → App:      http://localhost:5173"
echo "   → API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" SIGINT SIGTERM
wait
