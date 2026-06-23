#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOGDIR="$SCRIPT_DIR/.logs"
mkdir -p "$LOGDIR"

if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

if [ -z "$SUPABASE_DATABASE_URL" ]; then
  echo "ERROR: SUPABASE_DATABASE_URL is not set. Copy .env.example to .env and fill in your Supabase credentials."
  exit 1
fi

export DATABASE_URL="$SUPABASE_DATABASE_URL"

GOPATH="/home/kybo/.local/go/bin/go"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

PIDS=()
trap 'echo -e "\n${RED}Shutting down all services...${NC}"; kill "${PIDS[@]}" 2>/dev/null; echo "All services stopped."; exit 0' INT TERM

wait_for_port() {
  local port=$1
  local name=$2
  local max=30
  local i=0
  echo -n "  Waiting for $name on :$port"
  while ! fuser $port/tcp 2>/dev/null; do
    sleep 1
    i=$((i+1))
    if [ $i -ge $max ]; then
      echo -e "\n  ${RED}ERROR: $name failed to start on :$port${NC}"
      return 1
    fi
  done
  echo -e " ${GREEN}ready${NC}"
}

start_service() {
  local name=$1
  local dir=$2
  local port=$3
  local envfile=$4

  echo -e "${CYAN}[$name]${NC} Starting on :$port..."
  (
    cd "$SCRIPT_DIR/$dir"
    if [ -n "$envfile" ]; then
      export $(grep -v '^#' "$SCRIPT_DIR/$envfile" | xargs)
    fi
    export DATABASE_URL="$SUPABASE_DATABASE_URL"
    $GOPATH run . > "$LOGDIR/$name.log" 2>&1
  ) &
  PIDS+=($!)
  wait_for_port $port "$name"
}

echo "============================================"
echo "  Parking Violation Portal — Starting..."
echo "============================================"
echo "Logs: $LOGDIR/"
echo ""

start_service "fine-rule"   "services/fine-rule"   8083
start_service "violation"   "services/violation"   8082
start_service "payment"     "services/payment"     8084
start_service "api-gateway" "api-gateway"          8080

echo ""
echo "============================================"
echo -e "  ${GREEN}All services running${NC}"
echo "============================================"
echo ""
echo "  Services:"
echo "    API Gateway:  http://localhost:8080"
echo "    Fine Rule:    http://localhost:8083"
echo "    Violation:    http://localhost:8082"
echo "    Payment:      http://localhost:8084"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""
wait
